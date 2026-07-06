import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';

export type MerchantSettlementRow = {
  merchant_id: string;
  merchant_name: string;
  tier: string;
  order_count: number;
  gmv: number;
  stripe_fee: number;
  platform_fee: number;
  infra_allocated: number;
  delivery_cost: number;
  merchant_net: number;
};

export type MerchantSettlementView = {
  monthLabel: string;
  totals: Omit<MerchantSettlementRow, 'merchant_id' | 'merchant_name' | 'tier'>;
  rows: MerchantSettlementRow[];
};

export async function getMerchantSettlementView(
  monthParam?: string | null
): Promise<MerchantSettlementView> {
  const supabase = createAdminClient();
  const { monthStart, monthEnd, monthLabel } = parseMonthParam(monthParam);

  const { data: ledgerRows } = await (supabase as any)
    .from('order_ledger')
    .select(
      'merchant_id, gmv, stripe_fee, platform_fee_amount, infra_cost_allocated, delivery_cost, merchant_net'
    )
    .gte('paid_at', monthStart)
    .lt('paid_at', monthEnd)
    .neq('settlement_status', 'reversed');

  type LedgerRow = {
    merchant_id: string;
    gmv: number;
    stripe_fee: number;
    platform_fee_amount: number;
    infra_cost_allocated: number;
    delivery_cost: number;
    merchant_net: number;
  };

  const byMerchant = new Map<
    string,
    {
      order_count: number;
      gmv: number;
      stripe_fee: number;
      platform_fee: number;
      infra_allocated: number;
      delivery_cost: number;
      merchant_net: number;
    }
  >();

  for (const row of (ledgerRows || []) as LedgerRow[]) {
    const cur = byMerchant.get(row.merchant_id) || {
      order_count: 0,
      gmv: 0,
      stripe_fee: 0,
      platform_fee: 0,
      infra_allocated: 0,
      delivery_cost: 0,
      merchant_net: 0,
    };
    cur.order_count += 1;
    cur.gmv += Number(row.gmv);
    cur.stripe_fee += Number(row.stripe_fee);
    cur.platform_fee += Number(row.platform_fee_amount);
    cur.infra_allocated += Number(row.infra_cost_allocated || 0);
    cur.delivery_cost += Number(row.delivery_cost || 0);
    cur.merchant_net += Number(row.merchant_net);
    byMerchant.set(row.merchant_id, cur);
  }

  const merchantIds = [...byMerchant.keys()];
  const nameMap = new Map<string, { name: string; tier: string }>();

  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, name, tier')
      .in('id', merchantIds);

    for (const m of (merchants || []) as { id: string; name: string; tier: string }[]) {
      nameMap.set(m.id, { name: m.name, tier: m.tier || 'basic' });
    }
  }

  const rows: MerchantSettlementRow[] = merchantIds
    .map((id) => {
      const agg = byMerchant.get(id)!;
      const meta = nameMap.get(id);
      return {
        merchant_id: id,
        merchant_name: meta?.name || '—',
        tier: meta?.tier || 'basic',
        order_count: agg.order_count,
        gmv: roundMoney(agg.gmv),
        stripe_fee: roundMoney(agg.stripe_fee),
        platform_fee: roundMoney(agg.platform_fee),
        infra_allocated: roundMoney(agg.infra_allocated),
        delivery_cost: roundMoney(agg.delivery_cost),
        merchant_net: roundMoney(agg.merchant_net),
      };
    })
    .sort((a, b) => b.merchant_net - a.merchant_net);

  const totals = rows.reduce(
    (acc, r) => ({
      order_count: acc.order_count + r.order_count,
      gmv: acc.gmv + r.gmv,
      stripe_fee: acc.stripe_fee + r.stripe_fee,
      platform_fee: acc.platform_fee + r.platform_fee,
      infra_allocated: acc.infra_allocated + r.infra_allocated,
      delivery_cost: acc.delivery_cost + r.delivery_cost,
      merchant_net: acc.merchant_net + r.merchant_net,
    }),
    {
      order_count: 0,
      gmv: 0,
      stripe_fee: 0,
      platform_fee: 0,
      infra_allocated: 0,
      delivery_cost: 0,
      merchant_net: 0,
    }
  );

  return {
    monthLabel,
    totals: {
      order_count: totals.order_count,
      gmv: roundMoney(totals.gmv),
      stripe_fee: roundMoney(totals.stripe_fee),
      platform_fee: roundMoney(totals.platform_fee),
      infra_allocated: roundMoney(totals.infra_allocated),
      delivery_cost: roundMoney(totals.delivery_cost),
      merchant_net: roundMoney(totals.merchant_net),
    },
    rows,
  };
}
