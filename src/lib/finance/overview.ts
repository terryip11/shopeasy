import 'server-only';

import { getFinanceDashboardStats } from '@/lib/finance/stats';
import { getCourierPlatformFeeRevenueStats } from '@/lib/finance/courier-platform-revenue';
import { getCourierPayrollStats } from '@/lib/finance/courier-payroll';
import { getSubscriptionRevenueStats } from '@/lib/merchant/subscription';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';

export type FinanceOverview = {
  monthMerchantServiceFee: number;
  monthCourierPlatformFee: number;
  monthSubscriptionRevenue: number;
  monthPlatformRevenue: number;
  monthStripeFees: number;
  monthMerchantPayable: number;
  monthCourierPayable: number;
  pendingCourierPayroll: number;
  monthOrderCount: number;
  monthDeliveryCount: number;
};

export async function getFinanceOverview(monthParam?: string | null): Promise<FinanceOverview> {
  const [orderStats, courierRevenue, subscriptionStats, courierPayroll] = await Promise.all([
    getFinanceDashboardStats(monthParam),
    getCourierPlatformFeeRevenueStats(monthParam),
    getSubscriptionRevenueStats(monthParam),
    getCourierPayrollStats(),
  ]);

  const monthMerchantServiceFee = orderStats.monthPlatformFees;
  const monthCourierPlatformFee = courierRevenue.monthPlatformFee;
  const monthSubscriptionRevenue = subscriptionStats.monthRevenue;

  return {
    monthMerchantServiceFee,
    monthCourierPlatformFee,
    monthSubscriptionRevenue,
    monthPlatformRevenue: roundMoney(
      monthMerchantServiceFee + monthCourierPlatformFee + monthSubscriptionRevenue
    ),
    monthStripeFees: orderStats.monthStripeFees,
    monthMerchantPayable: await getMonthMerchantNetTotal(monthParam),
    monthCourierPayable: courierRevenue.monthCourierNet,
    pendingCourierPayroll: courierPayroll.pendingTotal,
    monthOrderCount: orderStats.monthOrderCount,
    monthDeliveryCount: courierRevenue.monthDeliveryCount,
  };
}

async function getMonthMerchantNetTotal(monthParam?: string | null): Promise<number> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const { monthStart, monthEnd } = parseMonthParam(monthParam);

  const { data } = await (supabase as any)
    .from('order_ledger')
    .select('merchant_net')
    .gte('paid_at', monthStart)
    .lt('paid_at', monthEnd)
    .neq('settlement_status', 'reversed');

  return roundMoney(
    ((data || []) as { merchant_net: number }[]).reduce((s, r) => s + Number(r.merchant_net), 0)
  );
}
