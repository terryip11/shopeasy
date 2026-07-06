import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseMonthParam } from '@/lib/finance/month-bounds';
import { syncPendingCourierEarnings } from '@/lib/finance/courier-earnings';

export type CourierPlatformFeeRevenueStats = {
  monthPlatformFee: number;
  monthGrossDelivery: number;
  monthCourierNet: number;
  monthDeliveryCount: number;
  allTimePlatformFee: number;
  recent: Array<{
    id: string;
    order_id: string;
    job_type: string;
    gross_amount: number;
    platform_fee_amount: number;
    courier_net: number;
    settlement_status: string;
    earned_at: string;
  }>;
};

export async function getCourierPlatformFeeRevenueStats(
  monthParam?: string | null
): Promise<CourierPlatformFeeRevenueStats> {
  await syncPendingCourierEarnings();

  const supabase = createAdminClient();
  const { monthStart, monthEnd } = parseMonthParam(monthParam);

  const [monthRes, allTimeRes, recentRes] = await Promise.all([
    (supabase as any)
      .from('courier_delivery_earnings')
      .select('gross_amount, platform_fee_amount, amount')
      .neq('settlement_status', 'reversed')
      .gte('earned_at', monthStart)
      .lt('earned_at', monthEnd),
    (supabase as any)
      .from('courier_delivery_earnings')
      .select('platform_fee_amount')
      .neq('settlement_status', 'reversed'),
    (supabase as any)
      .from('courier_delivery_earnings')
      .select(
        'id, order_id, job_type, gross_amount, platform_fee_amount, amount, settlement_status, earned_at'
      )
      .neq('settlement_status', 'reversed')
      .gte('earned_at', monthStart)
      .lt('earned_at', monthEnd)
      .order('earned_at', { ascending: false })
      .limit(20),
  ]);

  type MonthRow = {
    gross_amount: number | null;
    platform_fee_amount: number | null;
    amount: number;
  };

  const monthRows = (monthRes.data || []) as MonthRow[];
  let monthPlatformFee = 0;
  let monthGrossDelivery = 0;
  let monthCourierNet = 0;

  for (const row of monthRows) {
    const net = Number(row.amount);
    const gross = Number(row.gross_amount ?? net + Number(row.platform_fee_amount ?? 0));
    const fee = Number(row.platform_fee_amount ?? Math.max(0, gross - net));
    monthPlatformFee += fee;
    monthGrossDelivery += gross;
    monthCourierNet += net;
  }

  const allTimePlatformFee = roundMoney(
    ((allTimeRes.data || []) as { platform_fee_amount: number | null }[]).reduce(
      (sum, row) => sum + Number(row.platform_fee_amount ?? 0),
      0
    )
  );

  const recent = ((recentRes.data || []) as Array<{
    id: string;
    order_id: string;
    job_type: string;
    gross_amount: number | null;
    platform_fee_amount: number | null;
    amount: number;
    settlement_status: string;
    earned_at: string;
  }>).map((row) => {
    const net = Number(row.amount);
    const gross = Number(row.gross_amount ?? net + Number(row.platform_fee_amount ?? 0));
    const fee = Number(row.platform_fee_amount ?? Math.max(0, gross - net));
    return {
      id: row.id,
      order_id: row.order_id,
      job_type: row.job_type,
      gross_amount: gross,
      platform_fee_amount: fee,
      courier_net: net,
      settlement_status: row.settlement_status,
      earned_at: row.earned_at,
    };
  });

  return {
    monthPlatformFee: roundMoney(monthPlatformFee),
    monthGrossDelivery: roundMoney(monthGrossDelivery),
    monthCourierNet: roundMoney(monthCourierNet),
    monthDeliveryCount: monthRows.length,
    allTimePlatformFee,
    recent,
  };
}
