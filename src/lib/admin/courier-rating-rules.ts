import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/lib/admin/merchant-actions';

export type RatingSurchargeRow = {
  id: string;
  rating_below: number;
  surcharge_hkd: number;
  label: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
};

export async function getAdminRatingSurchargeRules(): Promise<RatingSurchargeRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('courier_buyer_rating_surcharges')
    .select('*')
    .order('rating_below', { ascending: true });

  if (error) throw error;
  return ((data || []) as RatingSurchargeRow[]).map((r) => ({
    ...r,
    rating_below: Number(r.rating_below),
    surcharge_hkd: Number(r.surcharge_hkd),
  }));
}

export async function upsertRatingSurchargeRule(
  input: {
    id?: string;
    rating_below: number;
    surcharge_hkd: number;
    label?: string | null;
    sort_order?: number;
    enabled?: boolean;
  },
  adminId: string
) {
  const supabase = createAdminClient();
  const patch = {
    rating_below: input.rating_below,
    surcharge_hkd: input.surcharge_hkd,
    label: input.label?.trim() || null,
    sort_order: input.sort_order ?? 0,
    enabled: input.enabled ?? true,
  };

  if (input.id) {
    const { data, error } = await (supabase as any)
      .from('courier_buyer_rating_surcharges')
      .update(patch)
      .eq('id', input.id)
      .select()
      .single();
    if (error) return { error: error.message, rule: null };
    await logAdminAction(adminId, 'courier_rating_rule.update', 'courier_buyer_rating_surcharges', input.id, patch);
    return { error: null, rule: data as RatingSurchargeRow };
  }

  const { data, error } = await (supabase as any)
    .from('courier_buyer_rating_surcharges')
    .insert(patch)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { error: '此評分門檻已存在', rule: null };
    return { error: error.message, rule: null };
  }

  const rule = data as RatingSurchargeRow;
  await logAdminAction(adminId, 'courier_rating_rule.create', 'courier_buyer_rating_surcharges', rule.id, patch);
  return { error: null, rule };
}

export async function deleteRatingSurchargeRule(id: string, adminId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('courier_buyer_rating_surcharges').delete().eq('id', id);
  if (error) return { error: error.message };
  await logAdminAction(adminId, 'courier_rating_rule.delete', 'courier_buyer_rating_surcharges', id, {});
  return { error: null };
}
