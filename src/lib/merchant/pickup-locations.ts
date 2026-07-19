import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import {
  resolveMerchantPickupDefaults,
  type MerchantPickupDefaults,
} from '@/lib/merchant/pickup-defaults';

export type MerchantPickupLocation =
  Database['public']['Tables']['merchant_pickup_locations']['Row'];

export type PickupLocationInput = {
  name: string;
  address: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  is_default?: boolean;
};

function normalizeInput(input: PickupLocationInput) {
  const name = input.name.trim();
  const address = input.address.trim();
  const contact_name = input.contact_name?.trim() || null;
  const contact_phone = input.contact_phone?.trim() || null;
  if (!name) return { error: '請填寫取件點名稱' as const };
  if (address.length < 5) return { error: '請填寫完整地址（至少 5 字）' as const };
  return {
    error: null as null,
    row: {
      name,
      address,
      contact_name,
      contact_phone,
      is_default: Boolean(input.is_default),
    },
  };
}

/** 同步商家表上的預設發貨欄位（相容舊邏輯） */
async function syncMerchantDefaultColumns(
  merchantId: string,
  loc: Pick<
    MerchantPickupLocation,
    'address' | 'contact_name' | 'contact_phone'
  > | null
) {
  const admin = createAdminClient();
  await (admin as any)
    .from('merchants')
    .update({
      default_pickup_address: loc?.address ?? null,
      default_pickup_contact_name: loc?.contact_name ?? null,
      default_pickup_contact_phone: loc?.contact_phone ?? null,
    })
    .eq('id', merchantId);
}

async function clearOtherDefaults(merchantId: string, keepId?: string) {
  const supabase = await createClient();
  let q = (supabase as any)
    .from('merchant_pickup_locations')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('is_default', true);
  if (keepId) q = q.neq('id', keepId);
  await q;
}

export async function listPickupLocationsForMerchant(
  merchantId: string,
  opts?: { admin?: boolean }
): Promise<MerchantPickupLocation[]> {
  const supabase = opts?.admin ? createAdminClient() : await createClient();
  const { data } = await supabase
    .from('merchant_pickup_locations')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return (data || []) as MerchantPickupLocation[];
}

export async function getDefaultPickupLocation(
  merchantId: string,
  opts?: { admin?: boolean }
): Promise<MerchantPickupLocation | null> {
  const list = await listPickupLocationsForMerchant(merchantId, opts);
  return list.find((l) => l.is_default) ?? list[0] ?? null;
}

/** 取件點優先；沒有則退回 merchants 舊欄位 */
export async function resolvePickupForMerchant(
  merchantId: string,
  merchantFallback?: Parameters<typeof resolveMerchantPickupDefaults>[0],
  opts?: { admin?: boolean }
): Promise<
  MerchantPickupDefaults & {
    locationId: string | null;
    locationName: string | null;
  }
> {
  const loc = await getDefaultPickupLocation(merchantId, opts);
  if (loc) {
    return {
      locationId: loc.id,
      locationName: loc.name,
      address: loc.address,
      contactName: loc.contact_name?.trim() || '',
      contactPhone: loc.contact_phone?.trim() || '',
    };
  }
  const legacy = resolveMerchantPickupDefaults(merchantFallback);
  return { ...legacy, locationId: null, locationName: null };
}

export async function createPickupLocation(
  merchantId: string,
  input: PickupLocationInput
) {
  const normalized = normalizeInput(input);
  if (normalized.error) return { error: normalized.error, data: null };

  const existing = await listPickupLocationsForMerchant(merchantId);
  const makeDefault = normalized.row.is_default || existing.length === 0;

  if (makeDefault) {
    await clearOtherDefaults(merchantId);
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('merchant_pickup_locations')
    .insert({
      merchant_id: merchantId,
      ...normalized.row,
      is_default: makeDefault,
      sort_order: existing.length,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  const row = data as MerchantPickupLocation;
  if (row.is_default) {
    await syncMerchantDefaultColumns(merchantId, row);
  }

  return { error: null, data: row };
}

export async function updatePickupLocation(
  merchantId: string,
  locationId: string,
  input: PickupLocationInput
) {
  const normalized = normalizeInput(input);
  if (normalized.error) return { error: normalized.error, data: null };

  if (normalized.row.is_default) {
    await clearOtherDefaults(merchantId, locationId);
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('merchant_pickup_locations')
    .update({
      ...normalized.row,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  const row = data as MerchantPickupLocation;

  // 若取消唯一預設，強制保留至少一個預設
  const list = await listPickupLocationsForMerchant(merchantId);
  const hasDefault = list.some((l) => l.is_default);
  if (!hasDefault && list.length > 0) {
    const first = list[0]!;
    await (supabase as any)
      .from('merchant_pickup_locations')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', first.id);
    await syncMerchantDefaultColumns(merchantId, {
      address: first.id === row.id ? row.address : first.address,
      contact_name: first.id === row.id ? row.contact_name : first.contact_name,
      contact_phone: first.id === row.id ? row.contact_phone : first.contact_phone,
    });
    const refreshed = await listPickupLocationsForMerchant(merchantId);
    return { error: null, data: refreshed.find((l) => l.id === locationId) ?? row };
  }

  if (row.is_default) {
    await syncMerchantDefaultColumns(merchantId, row);
  }

  return { error: null, data: row };
}

export async function setDefaultPickupLocation(merchantId: string, locationId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('merchant_pickup_locations')
    .select('*')
    .eq('id', locationId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (!existing) return { error: '取件點不存在', data: null };

  await clearOtherDefaults(merchantId, locationId);
  const { data, error } = await (supabase as any)
    .from('merchant_pickup_locations')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', locationId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  const row = data as MerchantPickupLocation;
  await syncMerchantDefaultColumns(merchantId, row);
  return { error: null, data: row };
}

export async function deletePickupLocation(merchantId: string, locationId: string) {
  const list = await listPickupLocationsForMerchant(merchantId);
  const target = list.find((l) => l.id === locationId);
  if (!target) return { error: '取件點不存在' };

  if (list.length <= 1) {
    return { error: '至少需保留一個取件點' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('merchant_pickup_locations')
    .delete()
    .eq('id', locationId)
    .eq('merchant_id', merchantId);

  if (error) return { error: error.message };

  if (target.is_default) {
    const remaining = list.filter((l) => l.id !== locationId);
    const next = remaining[0]!;
    await setDefaultPickupLocation(merchantId, next.id);
  }

  return { error: null };
}

export function locationToPickupDefaults(loc: MerchantPickupLocation): MerchantPickupDefaults & {
  locationId: string;
  locationName: string;
} {
  return {
    locationId: loc.id,
    locationName: loc.name,
    address: loc.address,
    contactName: loc.contact_name?.trim() || '',
    contactPhone: loc.contact_phone?.trim() || '',
  };
}

export type OrderPickupResolution = MerchantPickupDefaults & {
  locationId: string | null;
  locationName: string | null;
  /** 訂單商品解析出超過一個取件點 */
  conflict: boolean;
  distinctLocationIds: string[];
  note: string | null;
};

/**
 * 依訂單商品的 pickup_location_id 解析取件點。
 * null／無效 → 店鋪預設；若多商品指向不同取件點 → conflict，回傳預設取件點並附註記。
 */
export async function resolvePickupForOrderItems(
  merchantId: string,
  productIds: string[],
  merchantFallback?: Parameters<typeof resolveMerchantPickupDefaults>[0],
  opts?: { admin?: boolean }
): Promise<OrderPickupResolution> {
  const merchantDefault = await resolvePickupForMerchant(merchantId, merchantFallback, opts);
  const uniqueIds = [...new Set(productIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      ...merchantDefault,
      conflict: false,
      distinctLocationIds: merchantDefault.locationId ? [merchantDefault.locationId] : [],
      note: null,
    };
  }

  const supabase = opts?.admin ? createAdminClient() : await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, pickup_location_id')
    .eq('merchant_id', merchantId)
    .in('id', uniqueIds);

  const locations = await listPickupLocationsForMerchant(merchantId, opts);
  const byId = new Map(locations.map((l) => [l.id, l]));

  const resolvedIds: string[] = [];
  for (const p of (products || []) as { id: string; pickup_location_id: string | null }[]) {
    const locId = p.pickup_location_id;
    if (locId && byId.has(locId)) {
      resolvedIds.push(locId);
    } else if (merchantDefault.locationId) {
      resolvedIds.push(merchantDefault.locationId);
    }
  }

  // 若查不到商品列，仍用預設
  if (resolvedIds.length === 0) {
    return {
      ...merchantDefault,
      conflict: false,
      distinctLocationIds: merchantDefault.locationId ? [merchantDefault.locationId] : [],
      note: null,
    };
  }

  const distinct = [...new Set(resolvedIds)];
  if (distinct.length === 1) {
    const loc = byId.get(distinct[0]!);
    if (loc) {
      return {
        ...locationToPickupDefaults(loc),
        conflict: false,
        distinctLocationIds: distinct,
        note: null,
      };
    }
  }

  return {
    ...merchantDefault,
    conflict: true,
    distinctLocationIds: distinct,
    note: '訂單商品取件點不一致，已使用店鋪預設取件點；請自行確認或分批建立配送',
  };
}

