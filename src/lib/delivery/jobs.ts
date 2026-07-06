import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { capabilityForJobType } from '@/lib/auth/capabilities';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import { resolveDropoffCoordinates } from '@/lib/delivery/geo';
import type { Database } from '@/types/database';

type DeliveryJob = Database['public']['Tables']['delivery_jobs']['Row'];

export async function createDeliveryJobFromOrder(input: {
  orderId: string;
  jobType: DeliveryJobType;
  zoneId?: string | null;
  pickupAddress?: string;
  dropoffAddress?: string;
  notes?: string;
}) {
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, merchant_id')
    .eq('id', input.orderId)
    .single();

  if (!order) {
    return { error: '訂單不存在', job: null };
  }

  const row = order as { id: string; status: string };
  if (!['paid', 'shipped'].includes(row.status)) {
    return { error: '僅已付款或已發貨訂單可建立配送任務', job: null };
  }

  let zoneSlug: string | null = null;
  if (input.zoneId) {
    const { data: zone } = await supabase
      .from('delivery_zones')
      .select('slug')
      .eq('id', input.zoneId)
      .maybeSingle();
    zoneSlug = (zone as { slug: string } | null)?.slug ?? null;
  }

  const dropoffCoords = input.dropoffAddress
    ? await resolveDropoffCoordinates(input.dropoffAddress, zoneSlug)
    : null;

  const { data, error } = await (supabase as any)
    .from('delivery_jobs')
    .insert({
      order_id: input.orderId,
      job_type: input.jobType,
      zone_id: input.zoneId || null,
      pickup_address: input.pickupAddress || null,
      dropoff_address: input.dropoffAddress || null,
      dropoff_lat: dropoffCoords?.lat ?? null,
      dropoff_lng: dropoffCoords?.lng ?? null,
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: '此訂單已有進行中的同類型配送任務', job: null };
    }
    return { error: error.message, job: null };
  }

  return { error: null, job: data as DeliveryJob };
}

export async function approveCourierApplication(
  userId: string,
  adminId: string,
  jobTypes: DeliveryJobType[]
) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('courier_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return { error: '申請不存在' };

  const row = profile as Database['public']['Tables']['courier_profiles']['Row'];
  if (row.status !== 'pending') return { error: '申請狀態不可審核' };

  const capabilities = [...new Set(jobTypes.map(capabilityForJobType))];

  for (const cap of capabilities) {
    await (supabase as any)
      .from('user_capabilities')
      .upsert({ user_id: userId, capability: cap, granted_by: adminId }, {
        onConflict: 'user_id,capability',
      });
  }

  const { error } = await (supabase as any)
    .from('courier_profiles')
    .update({
      status: 'active',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function rejectCourierApplication(
  userId: string,
  adminId: string,
  reason: string
) {
  const supabase = createAdminClient();

  const { error } = await (supabase as any)
    .from('courier_profiles')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      reject_reason: reason,
    })
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) return { error: error.message };
  return { error: null };
}
