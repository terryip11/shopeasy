import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';
import { syncLedgerStripeFees } from '@/lib/finance/ledger';
import { getFinanceOverview } from '@/lib/finance/overview';

export type FinanceReconciliationView = {
  monthLabel: string;
  revenue: {
    merchantServiceFee: number;
    courierPlatformFee: number;
    subscriptionRevenue: number;
    total: number;
  };
  costs: {
    stripeFees: number;
    infraAllocated: number;
    fixedSupabase: number;
    fixedR2: number;
    fixedStripeReported: number;
    fixedOther: number;
    fixedTotal: number;
    total: number;
  };
  liabilities: {
    merchantPayable: number;
    courierPendingPayroll: number;
    total: number;
  };
  operatingSurplus: number;
  monthlyCostsNotes: string | null;
};

export async function getFinanceReconciliationView(
  monthParam?: string | null
): Promise<FinanceReconciliationView> {
  await syncLedgerStripeFees();

  const { monthStart, monthEnd, monthLabel } = parseMonthParam(monthParam);
  const supabase = createAdminClient();

  const [overview, ledgerInfra, costsRes] = await Promise.all([
    getFinanceOverview(monthParam),
    (supabase as any)
      .from('order_ledger')
      .select('infra_cost_allocated')
      .gte('paid_at', monthStart)
      .lt('paid_at', monthEnd)
      .neq('settlement_status', 'reversed'),
    (supabase as any)
      .from('platform_monthly_costs')
      .select('supabase_cost, r2_cost, stripe_fees_reported, other_cost, notes')
      .eq('month', monthStart)
      .maybeSingle(),
  ]);

  const infraAllocated = roundMoney(
    ((ledgerInfra.data || []) as { infra_cost_allocated: number }[]).reduce(
      (s, r) => s + Number(r.infra_cost_allocated || 0),
      0
    )
  );

  const costs = costsRes.data as {
    supabase_cost: number;
    r2_cost: number;
    stripe_fees_reported: number;
    other_cost: number;
    notes: string | null;
  } | null;

  const fixedSupabase = Number(costs?.supabase_cost ?? 0);
  const fixedR2 = Number(costs?.r2_cost ?? 0);
  const fixedStripeReported = Number(costs?.stripe_fees_reported ?? 0);
  const fixedOther = Number(costs?.other_cost ?? 0);
  const fixedTotal = roundMoney(fixedSupabase + fixedR2 + fixedStripeReported + fixedOther);

  const revenueTotal = overview.monthPlatformRevenue;
  const costTotal = roundMoney(
    overview.monthStripeFees + infraAllocated + fixedTotal
  );
  const liabilitiesTotal = roundMoney(
    overview.monthMerchantPayable + overview.pendingCourierPayroll
  );

  return {
    monthLabel,
    revenue: {
      merchantServiceFee: overview.monthMerchantServiceFee,
      courierPlatformFee: overview.monthCourierPlatformFee,
      subscriptionRevenue: overview.monthSubscriptionRevenue,
      total: revenueTotal,
    },
    costs: {
      stripeFees: overview.monthStripeFees,
      infraAllocated,
      fixedSupabase,
      fixedR2,
      fixedStripeReported,
      fixedOther,
      fixedTotal,
      total: costTotal,
    },
    liabilities: {
      merchantPayable: overview.monthMerchantPayable,
      courierPendingPayroll: overview.pendingCourierPayroll,
      total: liabilitiesTotal,
    },
    operatingSurplus: roundMoney(revenueTotal - costTotal),
    monthlyCostsNotes: costs?.notes ?? null,
  };
}
