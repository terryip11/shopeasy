import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth/server';
import {
  SERVER_LOCATION_MIN_INTERVAL_MS,
  SERVER_LOCATION_MIN_MOVE_METERS,
} from '@/lib/delivery/tracking-config';
import { completeOrderOnDelivery } from '@/lib/orders/complete-on-delivery';
import { recordCourierDeliveryEarning } from '@/lib/finance/courier-earnings';
import { notifyDeliveryClaimed, notifyDeliveryStatus } from '@/lib/push/notify-order';
import { haversineMeters } from '@/lib/delivery/coords';
import {
  normalizePickupCode,
  parsePickupQrPayload,
} from '@/lib/delivery/pickup-code';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import type { UserCapability } from '@/lib/auth/capabilities';
import type { Database } from '@/types/database';

type CourierProfile = Database['public']['Tables']['courier_profiles']['Row'];
type DeliveryJob = Database['public']['Tables']['delivery_jobs']['Row'];
type DeliveryZone = Database['public']['Tables']['delivery_zones']['Row'];

/** 配送員端不回傳取件碼，避免未掃描即可標記取件 */
function omitPickupCode(job: DeliveryJob): DeliveryJob {
  const { pickup_code: _code, ...rest } = job;
  return { ...rest, pickup_code: '' } as DeliveryJob;
}

function omitPickupCodes(jobs: DeliveryJob[]): DeliveryJob[] {
  return jobs.map(omitPickupCode);
}

export async function getUserCapabilities(userId?: string): Promise<UserCapability[]> {
  const uid = userId ?? (await getAuthUser())?.id;
  if (!uid) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_capabilities')
    .select('capability')
    .eq('user_id', uid);

  return ((data || []) as { capability: UserCapability }[]).map((r) => r.capability);
}

export async function hasUserCapability(
  capability: UserCapability,
  userId?: string
): Promise<boolean> {
  const caps = await getUserCapabilities(userId);
  return caps.includes(capability);
}

export async function getCourierProfile(userId?: string): Promise<CourierProfile | null> {
  const uid = userId ?? (await getAuthUser())?.id;
  if (!uid) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('courier_profiles')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  return data as CourierProfile | null;
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('region', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  return (data || []) as DeliveryZone[];
}

export type CourierAvailableJobsResult = {
  jobs: DeliveryJob[];
  /** 符合類型與權限、但不在配送員負責區域內的待接單數 */
  outsideZoneCount: number;
  zoneNames: string[];
};

async function getZoneNames(zoneIds: string[]): Promise<string[]> {
  if (zoneIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('delivery_zones').select('id, name').in('id', zoneIds);
  const nameById = new Map(
    ((data || []) as { id: string; name: string }[]).map((z) => [z.id, z.name])
  );
  return zoneIds.map((id) => nameById.get(id) ?? id.slice(0, 8));
}

export async function getAvailableJobsForCourier(
  jobType?: DeliveryJobType
): Promise<CourierAvailableJobsResult> {
  const empty = (zoneNames: string[] = []): CourierAvailableJobsResult => ({
    jobs: [],
    outsideZoneCount: 0,
    zoneNames,
  });

  const user = await getAuthUser();
  if (!user) return empty();

  const [profile, capabilities] = await Promise.all([
    getCourierProfile(user.id),
    getUserCapabilities(user.id),
  ]);

  if (!profile || profile.status !== 'active' || !profile.is_online) {
    const zoneNames = profile ? await getZoneNames(profile.zone_ids) : [];
    return empty(zoneNames);
  }

  const zoneNames = await getZoneNames(profile.zone_ids);

  const supabase = await createClient();
  let query = supabase
    .from('delivery_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const { data: jobs } = await query;
  const list = (jobs || []) as DeliveryJob[];

  const capabilityMatched = list.filter((job) => {
    const cap = job.job_type === 'food' ? 'food_courier' : 'parcel_courier';
    return capabilities.includes(cap);
  });

  if (profile.zone_ids.length === 0) {
    return { jobs: omitPickupCodes(capabilityMatched), outsideZoneCount: 0, zoneNames };
  }

  const zoneSet = new Set(profile.zone_ids);
  const inZone = capabilityMatched.filter((job) => job.zone_id && zoneSet.has(job.zone_id));
  const outsideZoneCount = capabilityMatched.filter(
    (job) => job.zone_id && !zoneSet.has(job.zone_id)
  ).length;

  return { jobs: omitPickupCodes(inZone), outsideZoneCount, zoneNames };
}

export async function getCourierActiveJobs(jobType?: DeliveryJobType): Promise<DeliveryJob[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  let query = supabase
    .from('delivery_jobs')
    .select('*')
    .eq('courier_id', user.id)
    .in('status', ['assigned', 'picked_up'])
    .order('assigned_at', { ascending: false });

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const { data } = await query;

  return omitPickupCodes((data || []) as DeliveryJob[]);
}

export async function claimDeliveryJob(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc('claim_delivery_job', {
    p_job_id: jobId,
  });

  if (!error && data) {
    void notifyDeliveryClaimed((data as DeliveryJob).order_id);
  }

  return { data: data ? omitPickupCode(data as DeliveryJob) : null, error };
}

export async function updateJobStatus(
  jobId: string,
  status: 'picked_up' | 'delivered' | 'failed',
  location?: { lat: number; lng: number },
  pickupCodeRaw?: string
) {
  const user = await getAuthUser();
  if (!user) return { error: new Error('未登入') };

  const supabase = await createClient();

  if (status === 'picked_up') {
    const parsed = parsePickupQrPayload(pickupCodeRaw || '');
    const submitted = normalizePickupCode(parsed?.code || pickupCodeRaw || '');
    if (!submitted) {
      return { error: new Error('請掃描貨件 QR 或輸入取件確認碼') };
    }
    if (parsed?.jobId && parsed.jobId !== jobId) {
      return { error: new Error('此 QR 碼不屬於此配送任務') };
    }

    const { data: existing } = await supabase
      .from('delivery_jobs')
      .select('id, pickup_code, status')
      .eq('id', jobId)
      .eq('courier_id', user.id)
      .eq('status', 'assigned')
      .maybeSingle();

    const row = existing as { id: string; pickup_code: string; status: string } | null;
    if (!row) {
      return { error: new Error('任務不存在或狀態不可取件') };
    }

    if (normalizePickupCode(row.pickup_code) !== submitted) {
      return { error: new Error('取件確認碼不正確') };
    }
  }

  const patch: Record<string, unknown> = { status };

  if (status === 'picked_up') patch.picked_up_at = new Date().toISOString();
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();

  if (location) {
    patch.courier_lat = location.lat;
    patch.courier_lng = location.lng;
    patch.courier_location_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as any)
    .from('delivery_jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('courier_id', user.id)
    .in('status', status === 'picked_up' ? ['assigned'] : ['picked_up'])
    .select()
    .single();

  if (!error && data && status === 'delivered') {
    const earning = await recordCourierDeliveryEarning(jobId);
    if (!earning.ok && !earning.skipped) {
      console.error('[courier] record earning:', earning.error);
    }
    try {
      await completeOrderOnDelivery((data as DeliveryJob).order_id);
    } catch (e) {
      console.error('[courier] complete order:', e);
    }
  }

  if (!error && data) {
    void notifyDeliveryStatus((data as DeliveryJob).order_id, status);
  }

  return { data: data ? omitPickupCode(data as DeliveryJob) : null, error };
}

export async function updateCourierLocation(jobId: string, lat: number, lng: number) {
  const user = await getAuthUser();
  if (!user) return { error: new Error('未登入'), skipped: false };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('delivery_jobs')
    .select('courier_lat, courier_lng, courier_location_at, status')
    .eq('id', jobId)
    .eq('courier_id', user.id)
    .maybeSingle();

  const row = existing as {
    courier_lat: number | null;
    courier_lng: number | null;
    courier_location_at: string | null;
    status: string;
  } | null;

  if (!row || !['assigned', 'picked_up'].includes(row.status)) {
    return { error: new Error('任務不存在或已結束'), skipped: false };
  }

  if (row.courier_lat != null && row.courier_lng != null && row.courier_location_at) {
    const elapsed = Date.now() - new Date(row.courier_location_at).getTime();
    const moved = haversineMeters(
      { lat: Number(row.courier_lat), lng: Number(row.courier_lng) },
      { lat, lng }
    );
    if (elapsed < SERVER_LOCATION_MIN_INTERVAL_MS && moved < SERVER_LOCATION_MIN_MOVE_METERS) {
      return { error: null, skipped: true };
    }
  }

  const { error } = await (supabase as any)
    .from('delivery_jobs')
    .update({
      courier_lat: lat,
      courier_lng: lng,
      courier_location_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('courier_id', user.id)
    .in('status', ['assigned', 'picked_up']);

  return { error, skipped: false };
}

export async function updateCourierLocationForActiveJobs(lat: number, lng: number) {
  const user = await getAuthUser();
  if (!user) return { error: new Error('未登入'), skipped: false, updated: 0 };

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('delivery_jobs')
    .select('id, courier_lat, courier_lng, courier_location_at')
    .eq('courier_id', user.id)
    .in('status', ['assigned', 'picked_up']);

  const list = (jobs || []) as {
    id: string;
    courier_lat: number | null;
    courier_lng: number | null;
    courier_location_at: string | null;
  }[];

  if (list.length === 0) {
    return { error: new Error('沒有進行中的配送任務'), skipped: false, updated: 0 };
  }

  const sample = list[0];
  if (
    sample.courier_lat != null &&
    sample.courier_lng != null &&
    sample.courier_location_at
  ) {
    const elapsed = Date.now() - new Date(sample.courier_location_at).getTime();
    const moved = haversineMeters(
      { lat: Number(sample.courier_lat), lng: Number(sample.courier_lng) },
      { lat, lng }
    );
    if (elapsed < SERVER_LOCATION_MIN_INTERVAL_MS && moved < SERVER_LOCATION_MIN_MOVE_METERS) {
      return { error: null, skipped: true, updated: 0 };
    }
  }

  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('delivery_jobs')
    .update({
      courier_lat: lat,
      courier_lng: lng,
      courier_location_at: now,
    })
    .eq('courier_id', user.id)
    .in('status', ['assigned', 'picked_up']);

  return { error, skipped: false, updated: list.length };
}

export async function getPendingCourierApplications() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('courier_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('applied_at', { ascending: true });

  return (data || []) as Database['public']['Tables']['courier_profiles']['Row'][];
}
