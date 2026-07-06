import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';

function monthStartKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function nextMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** 當月固定成本 ÷ 當月已記帳訂單數（含本單） */
export async function allocateInfraCostForOrder(paidAt: Date): Promise<number> {
  const supabase = createAdminClient();
  const monthKey = monthStartKey(paidAt);
  const monthEnd = nextMonthStart(paidAt);

  const { data: costs } = await (supabase as any)
    .from('platform_monthly_costs')
    .select('supabase_cost, r2_cost, other_cost')
    .eq('month', monthKey)
    .maybeSingle();

  if (!costs) return 0;

  const total =
    Number(costs.supabase_cost || 0) +
    Number(costs.r2_cost || 0) +
    Number(costs.other_cost || 0);

  if (total <= 0) return 0;

  const { count } = await (supabase as any)
    .from('order_ledger')
    .select('*', { count: 'exact', head: true })
    .gte('paid_at', monthKey)
    .lt('paid_at', monthEnd.toISOString())
    .neq('settlement_status', 'reversed');

  const orderCount = Math.max((count || 0) + 1, 1);
  return roundMoney(total / orderCount);
}
