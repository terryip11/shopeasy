import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';

export type FinanceDashboardStats = {
  monthGmv: number;
  monthPlatformFees: number;
  monthStripeFees: number;
  monthPlatformNet: number;
  monthOrderCount: number;
  monthManualOrderCount: number;
  monthInfraAllocated: number;
  allTimePlatformFees: number;
  recentLedger: Array<{
    id: string;
    order_id: string;
    merchant_name: string;
    gmv: number;
    payment_method: string;
    stripe_fee: number;
    platform_fee_amount: number;
    delivery_cost: number;
    merchant_net: number;
    settlement_status: string;
    paid_at: string;
  }>;
  monthlyCosts: {
    month: string;
    supabase_cost: number;
    r2_cost: number;
    stripe_fees_reported: number;
    other_cost: number;
    notes: string | null;
  } | null;
};

export async function getFinanceDashboardStats(
  monthParam?: string | null
): Promise<FinanceDashboardStats> {
  const supabase = createAdminClient();
  const { monthStart, monthEnd } = parseMonthParam(monthParam);

  const { data: monthRows } = await (supabase as any)
    .from('order_ledger')
    .select(
      'id, order_id, merchant_id, gmv, payment_method, stripe_fee, platform_fee_amount, platform_net, merchant_net, delivery_cost, infra_cost_allocated, settlement_status, paid_at'
    )
    .gte('paid_at', monthStart)
    .lt('paid_at', monthEnd)
    .neq('settlement_status', 'reversed');

  const rows = (monthRows || []) as Array<{
    gmv: number;
    payment_method: string;
    stripe_fee: number;
    platform_fee_amount: number;
    platform_net: number;
    infra_cost_allocated?: number;
  }>;

  const monthGmv = roundMoney(rows.reduce((s, r) => s + Number(r.gmv), 0));
  const monthPlatformFees = roundMoney(rows.reduce((s, r) => s + Number(r.platform_fee_amount), 0));
  const monthStripeFees = roundMoney(rows.reduce((s, r) => s + Number(r.stripe_fee), 0));
  const monthPlatformNet = roundMoney(rows.reduce((s, r) => s + Number(r.platform_net), 0));
  const monthInfraAllocated = roundMoney(
    rows.reduce((s, r) => s + Number(r.infra_cost_allocated || 0), 0)
  );
  const monthManualOrderCount = rows.filter((r) => r.payment_method !== 'card').length;

  const { data: allTime } = await (supabase as any)
    .from('order_ledger')
    .select('platform_fee_amount')
    .neq('settlement_status', 'reversed');

  const allTimePlatformFees = roundMoney(
    ((allTime || []) as { platform_fee_amount: number }[]).reduce(
      (s, r) => s + Number(r.platform_fee_amount),
      0
    )
  );

  const { data: recent } = await (supabase as any)
    .from('order_ledger')
    .select(
      'id, order_id, merchant_id, gmv, payment_method, stripe_fee, platform_fee_amount, platform_net, merchant_net, delivery_cost, settlement_status, paid_at'
    )
    .gte('paid_at', monthStart)
    .lt('paid_at', monthEnd)
    .order('paid_at', { ascending: false })
    .limit(20);

  const merchantIds = [
    ...new Set(((recent || []) as { merchant_id: string }[]).map((r) => r.merchant_id)),
  ];
  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, name')
    .in('id', merchantIds.length ? merchantIds : ['00000000-0000-0000-0000-000000000000']);

  const nameMap = new Map(
    ((merchants || []) as { id: string; name: string }[]).map((m) => [m.id, m.name])
  );

  const recentLedger = ((recent || []) as Array<{
    id: string;
    order_id: string;
    merchant_id: string;
    gmv: number;
    payment_method: string;
    stripe_fee: number;
    platform_fee_amount: number;
    delivery_cost: number;
    merchant_net: number;
    settlement_status: string;
    paid_at: string;
  }>).map((r) => ({
    id: r.id,
    order_id: r.order_id,
    merchant_name: nameMap.get(r.merchant_id) || '—',
    gmv: Number(r.gmv),
    payment_method: r.payment_method,
    stripe_fee: Number(r.stripe_fee),
    platform_fee_amount: Number(r.platform_fee_amount),
    delivery_cost: Number(r.delivery_cost ?? 0),
    merchant_net: Number(r.merchant_net),
    settlement_status: r.settlement_status,
    paid_at: r.paid_at,
  }));

  const { data: costs } = await (supabase as any)
    .from('platform_monthly_costs')
    .select('month, supabase_cost, r2_cost, stripe_fees_reported, other_cost, notes')
    .eq('month', monthStart)
    .maybeSingle();

  return {
    monthGmv,
    monthPlatformFees,
    monthStripeFees,
    monthPlatformNet,
    monthOrderCount: rows.length,
    monthManualOrderCount,
    monthInfraAllocated,
    allTimePlatformFees,
    recentLedger,
    monthlyCosts: costs
      ? {
          month: costs.month,
          supabase_cost: Number(costs.supabase_cost),
          r2_cost: Number(costs.r2_cost),
          stripe_fees_reported: Number(costs.stripe_fees_reported),
          other_cost: Number(costs.other_cost),
          notes: costs.notes,
        }
      : null,
  };
}

export async function upsertMonthlyCosts(input: {
  month: string;
  supabase_cost: number;
  r2_cost: number;
  stripe_fees_reported: number;
  other_cost: number;
  notes?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('platform_monthly_costs')
    .upsert(
      {
        month: input.month,
        supabase_cost: input.supabase_cost,
        r2_cost: input.r2_cost,
        stripe_fees_reported: input.stripe_fees_reported,
        other_cost: input.other_cost,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'month' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
