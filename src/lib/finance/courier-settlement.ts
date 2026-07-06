import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';
import { syncPendingCourierEarnings } from '@/lib/finance/courier-earnings';

export type CourierSettlementRow = {
  courier_id: string;
  display_name: string;
  delivery_count: number;
  gross_total: number;
  platform_fee_total: number;
  courier_net_total: number;
  pending_net: number;
  settled_net: number;
};

export type CourierSettlementView = {
  monthLabel: string;
  totals: Omit<CourierSettlementRow, 'courier_id' | 'display_name'>;
  rows: CourierSettlementRow[];
};

export async function getCourierSettlementView(
  monthParam?: string | null
): Promise<CourierSettlementView> {
  await syncPendingCourierEarnings();

  const supabase = createAdminClient();
  const { monthStart, monthEnd, monthLabel } = parseMonthParam(monthParam);

  const { data: earnings } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('courier_id, amount, gross_amount, platform_fee_amount, settlement_status')
    .neq('settlement_status', 'reversed')
    .gte('earned_at', monthStart)
    .lt('earned_at', monthEnd);

  type EarningRow = {
    courier_id: string;
    amount: number;
    gross_amount: number | null;
    platform_fee_amount: number | null;
    settlement_status: string;
  };

  const byCourier = new Map<
    string,
    {
      delivery_count: number;
      gross_total: number;
      platform_fee_total: number;
      courier_net_total: number;
      pending_net: number;
      settled_net: number;
    }
  >();

  for (const row of (earnings || []) as EarningRow[]) {
    const net = Number(row.amount);
    const gross = Number(row.gross_amount ?? net + Number(row.platform_fee_amount ?? 0));
    const fee = Number(row.platform_fee_amount ?? Math.max(0, gross - net));

    const cur = byCourier.get(row.courier_id) || {
      delivery_count: 0,
      gross_total: 0,
      platform_fee_total: 0,
      courier_net_total: 0,
      pending_net: 0,
      settled_net: 0,
    };
    cur.delivery_count += 1;
    cur.gross_total += gross;
    cur.platform_fee_total += fee;
    cur.courier_net_total += net;
    if (row.settlement_status === 'pending') cur.pending_net += net;
    else if (row.settlement_status === 'settled') cur.settled_net += net;
    byCourier.set(row.courier_id, cur);
  }

  const courierIds = [...byCourier.keys()];
  const names: Record<string, string> = {};

  if (courierIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', courierIds);

    for (const p of (profiles || []) as { id: string; display_name: string | null }[]) {
      names[p.id] = p.display_name?.trim() || '配送員';
    }
  }

  const rows: CourierSettlementRow[] = courierIds
    .map((id) => {
      const agg = byCourier.get(id)!;
      return {
        courier_id: id,
        display_name: names[id] || '配送員',
        delivery_count: agg.delivery_count,
        gross_total: roundMoney(agg.gross_total),
        platform_fee_total: roundMoney(agg.platform_fee_total),
        courier_net_total: roundMoney(agg.courier_net_total),
        pending_net: roundMoney(agg.pending_net),
        settled_net: roundMoney(agg.settled_net),
      };
    })
    .sort((a, b) => b.courier_net_total - a.courier_net_total);

  const totals = rows.reduce(
    (acc, r) => ({
      delivery_count: acc.delivery_count + r.delivery_count,
      gross_total: acc.gross_total + r.gross_total,
      platform_fee_total: acc.platform_fee_total + r.platform_fee_total,
      courier_net_total: acc.courier_net_total + r.courier_net_total,
      pending_net: acc.pending_net + r.pending_net,
      settled_net: acc.settled_net + r.settled_net,
    }),
    {
      delivery_count: 0,
      gross_total: 0,
      platform_fee_total: 0,
      courier_net_total: 0,
      pending_net: 0,
      settled_net: 0,
    }
  );

  return {
    monthLabel,
    totals: {
      delivery_count: totals.delivery_count,
      gross_total: roundMoney(totals.gross_total),
      platform_fee_total: roundMoney(totals.platform_fee_total),
      courier_net_total: roundMoney(totals.courier_net_total),
      pending_net: roundMoney(totals.pending_net),
      settled_net: roundMoney(totals.settled_net),
    },
    rows,
  };
}
