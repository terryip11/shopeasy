import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { UserCapability } from '@/lib/auth/capabilities';
import type { CourierProfileStatus } from '@/types/database';

export type AdminCourierRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  status: CourierProfileStatus;
  is_online: boolean;
  vehicle_type: string | null;
  preferred_job_type: string | null;
  zone_ids: string[];
  zone_names: string[];
  capabilities: UserCapability[];
  applied_at: string;
  reviewed_at: string | null;
};

export type AdminDeliveryZoneRow = {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  created_at: string;
};

export async function getAdminDeliveryZones(): Promise<AdminDeliveryZoneRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('id, name, slug, region, created_at')
    .order('region', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as AdminDeliveryZoneRow[];
}

export async function getAdminCouriersList(options?: {
  status?: CourierProfileStatus | 'all';
}): Promise<AdminCourierRow[]> {
  const supabase = createAdminClient();
  const statusFilter = options?.status ?? 'all';

  let query = supabase
    .from('courier_profiles')
    .select('*')
    .order('applied_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  } else {
    query = query.neq('status', 'pending');
  }

  const { data: profiles, error } = await query;
  if (error) throw error;

  const rows = (profiles || []) as Array<{
    user_id: string;
    phone: string | null;
    status: CourierProfileStatus;
    is_online: boolean;
    vehicle_type: string | null;
    preferred_job_type: string | null;
    zone_ids: string[];
    applied_at: string;
    reviewed_at: string | null;
  }>;

  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const allZoneIds = [...new Set(rows.flatMap((r) => r.zone_ids))];

  const [{ data: profileRows }, { data: capRows }, { data: zoneRows }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('user_capabilities').select('user_id, capability').in('user_id', userIds),
    allZoneIds.length > 0
      ? supabase.from('delivery_zones').select('id, name').in('id', allZoneIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map(
    ((profileRows || []) as { id: string; display_name: string | null }[]).map((p) => [
      p.id,
      p.display_name?.trim() || null,
    ])
  );

  const capsByUser = new Map<string, UserCapability[]>();
  for (const c of (capRows || []) as { user_id: string; capability: UserCapability }[]) {
    const list = capsByUser.get(c.user_id) ?? [];
    list.push(c.capability);
    capsByUser.set(c.user_id, list);
  }

  const zoneNameById = new Map(
    ((zoneRows || []) as { id: string; name: string }[]).map((z) => [z.id, z.name])
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    display_name: nameById.get(r.user_id) ?? null,
    phone: r.phone,
    status: r.status,
    is_online: r.is_online,
    vehicle_type: r.vehicle_type,
    preferred_job_type: r.preferred_job_type,
    zone_ids: r.zone_ids,
    zone_names: r.zone_ids.map((id) => zoneNameById.get(id) ?? id.slice(0, 8)),
    capabilities: capsByUser.get(r.user_id) ?? [],
    applied_at: r.applied_at,
    reviewed_at: r.reviewed_at,
  }));
}

export async function getPendingCourierCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('courier_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}

export async function updateAdminCourier(
  userId: string,
  adminId: string,
  patch: {
    zone_ids?: string[];
    status?: 'active' | 'suspended';
    job_types?: ('food' | 'parcel')[];
  }
) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('courier_profiles')
    .select('user_id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) return { error: '配送員不存在' };

  const row = existing as { user_id: string; status: CourierProfileStatus };
  if (row.status === 'pending') {
    return { error: '待審核申請請使用審核流程' };
  }

  const profilePatch: Record<string, unknown> = {};
  if (patch.zone_ids) profilePatch.zone_ids = patch.zone_ids;
  if (patch.status) {
    profilePatch.status = patch.status;
    if (patch.status === 'suspended') profilePatch.is_online = false;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await (supabase as any)
      .from('courier_profiles')
      .update(profilePatch)
      .eq('user_id', userId);
    if (error) return { error: error.message };
  }

  if (patch.job_types) {
    const desired = new Set(
      patch.job_types.map((t) => (t === 'food' ? 'food_courier' : 'parcel_courier'))
    );
    const { data: currentCaps } = await supabase
      .from('user_capabilities')
      .select('capability')
      .eq('user_id', userId)
      .in('capability', ['food_courier', 'parcel_courier']);

    const current = new Set(
      ((currentCaps || []) as { capability: UserCapability }[]).map((c) => c.capability)
    );

    for (const cap of ['food_courier', 'parcel_courier'] as const) {
      if (desired.has(cap) && !current.has(cap)) {
        await (supabase as any)
          .from('user_capabilities')
          .upsert({ user_id: userId, capability: cap, granted_by: adminId });
      }
      if (!desired.has(cap) && current.has(cap)) {
        await supabase
          .from('user_capabilities')
          .delete()
          .eq('user_id', userId)
          .eq('capability', cap);
      }
    }
  }

  return { error: null };
}

export async function createDeliveryZone(input: { name: string; slug: string; region: string }) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('delivery_zones')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      region: input.region.trim(),
    })
    .select('id, name, slug, region, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'slug 已存在', zone: null };
    return { error: error.message, zone: null };
  }

  return { error: null, zone: data as AdminDeliveryZoneRow };
}

export async function updateDeliveryZone(
  id: string,
  input: { name?: string; slug?: string; region?: string }
) {
  const supabase = createAdminClient();
  const patch: Record<string, string> = {};
  if (input.name) patch.name = input.name.trim();
  if (input.slug) patch.slug = input.slug.trim().toLowerCase();
  if (input.region) patch.region = input.region.trim();

  const { data, error } = await (supabase as any)
    .from('delivery_zones')
    .update(patch)
    .eq('id', id)
    .select('id, name, slug, region, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'slug 已存在', zone: null };
    return { error: error.message, zone: null };
  }

  return { error: null, zone: data as AdminDeliveryZoneRow };
}

export async function deleteDeliveryZone(id: string) {
  const supabase = createAdminClient();

  const [{ count: orderCount }, { count: jobCount }, { data: couriers }] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('shipping_zone_id', id),
    supabase
      .from('delivery_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('zone_id', id),
    supabase.from('courier_profiles').select('user_id, zone_ids'),
  ]);

  if ((orderCount ?? 0) > 0 || (jobCount ?? 0) > 0) {
    return { error: '此區域已有訂單或配送任務使用，無法刪除' };
  }

  const inUse = ((couriers || []) as { zone_ids: string[] }[]).some((c) =>
    c.zone_ids.includes(id)
  );
  if (inUse) {
    return { error: '仍有配送員負責此區域，請先調整配送員服務區域' };
  }

  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}
