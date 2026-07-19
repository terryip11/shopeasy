import 'server-only';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { shippingSchema, type ShippingInfo } from '@/lib/checkout/shipping';
import type { Database } from '@/types/database';

export type BuyerAddress = Database['public']['Tables']['buyer_addresses']['Row'];

export const buyerAddressSchema = shippingSchema.extend({
  label: z.string().max(40, '標籤最多 40 字').optional().nullable(),
  is_default: z.boolean().optional(),
});

export type BuyerAddressInput = z.infer<typeof buyerAddressSchema>;

function normalizePhone(phone: string) {
  return phone.replace(/\s/g, '');
}

async function clearDefaultForUser(userId: string) {
  const supabase = createAdminClient();
  await (supabase as any)
    .from('buyer_addresses')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_default', true);
}

export async function listBuyerAddresses(userId: string): Promise<BuyerAddress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('buyer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.message?.includes('buyer_addresses')) {
      throw new Error('請執行 supabase/migrate-v31-buyer-addresses.sql');
    }
    throw new Error(error.message);
  }

  return (data || []) as BuyerAddress[];
}

export async function getBuyerDefaultAddress(userId: string): Promise<BuyerAddress | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('buyer_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (data) return data as BuyerAddress;

  const { data: latest } = await supabase
    .from('buyer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as BuyerAddress | null) ?? null;
}

export async function createBuyerAddress(
  userId: string,
  input: BuyerAddressInput
): Promise<{ address: BuyerAddress | null; error: string | null }> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('buyer_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const isFirst = (count ?? 0) === 0;
  const makeDefault = input.is_default ?? isFirst;

  if (makeDefault) {
    await clearDefaultForUser(userId);
  }

  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from('buyer_addresses')
    .insert({
      user_id: userId,
      label: input.label?.trim() || null,
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      address: input.address.trim(),
      zone_id: input.zone_id ?? null,
      is_default: makeDefault,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    return { address: null, error: error.message };
  }

  return { address: data as BuyerAddress, error: null };
}

export async function updateBuyerAddress(
  userId: string,
  addressId: string,
  input: Partial<BuyerAddressInput>
): Promise<{ address: BuyerAddress | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('buyer_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return { address: null, error: '地址不存在' };
  }

  if (input.is_default) {
    await clearDefaultForUser(userId);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) patch.label = input.label?.trim() || null;
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.phone !== undefined) patch.phone = normalizePhone(input.phone);
  if (input.address !== undefined) patch.address = input.address.trim();
  if (input.zone_id !== undefined) patch.zone_id = input.zone_id;
  if (input.is_default !== undefined) patch.is_default = input.is_default;

  const { data, error } = await (supabase as any)
    .from('buyer_addresses')
    .update(patch)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { address: null, error: error.message };
  }

  return { address: data as BuyerAddress, error: null };
}

export async function deleteBuyerAddress(
  userId: string,
  addressId: string
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from('buyer_addresses')
    .select('id, is_default')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!row) {
    return { error: '地址不存在' };
  }

  const { error } = await supabase
    .from('buyer_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  if ((row as { is_default: boolean }).is_default) {
    const { data: next } = await supabase
      .from('buyer_addresses')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next) {
      await (supabase as any)
        .from('buyer_addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', (next as { id: string }).id);
    }
  }

  return { error: null };
}

/** 結帳後儲存地址；若內容相同則更新時間並可設為預設 */
export async function saveShippingToAddressBook(
  userId: string,
  shipping: ShippingInfo,
  options?: { label?: string | null; setDefault?: boolean }
): Promise<void> {
  const addresses = await listBuyerAddresses(userId);
  const phone = normalizePhone(shipping.phone);
  const match = addresses.find(
    (a) =>
      (a.zone_id ?? null) === (shipping.zone_id ?? null) &&
      normalizePhone(a.phone) === phone &&
      a.address.trim() === shipping.address.trim() &&
      a.name.trim() === shipping.name.trim()
  );

  if (match) {
    await updateBuyerAddress(userId, match.id, {
      label: options?.label ?? match.label,
      is_default: options?.setDefault ?? match.is_default,
    });
    return;
  }

  await createBuyerAddress(userId, {
    ...shipping,
    label: options?.label ?? null,
    is_default: options?.setDefault ?? addresses.length === 0,
  });
}
