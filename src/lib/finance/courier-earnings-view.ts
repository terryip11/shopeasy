import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { roundMoney } from '@/lib/finance/config';
import { syncPendingCourierEarnings } from '@/lib/finance/courier-earnings';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';

export type CourierEarningItem = {
  id: string;
  order_id: string;
  job_type: string;
  /** 配送員實收 */
  amount: number;
  gross_amount: number | null;
  platform_fee_amount: number | null;
  base_amount: number | null;
  rating_surcharge: number | null;
  settlement_status: 'pending' | 'settled' | 'reversed';
  earned_at: string;
  merchant_paid_at: string | null;
  can_report_unpaid?: boolean;
};

export type CourierEarningsSummary = {
  todayAmount: number;
  todayCount: number;
  monthPendingAmount: number;
  monthPendingCount: number;
  monthSettledAmount: number;
  monthSettledCount: number;
  lastSettledAmount: number | null;
  lastSettledLabel: string | null;
  customerRatingAvg: number | null;
  customerRatingCount: number;
};

export type CourierEarningsView = {
  summary: CourierEarningsSummary;
  recent: CourierEarningItem[];
};

type EarningRow = {
  id: string;
  order_id: string;
  job_type: string;
  amount: number;
  gross_amount: number | null;
  platform_fee_amount: number | null;
  base_amount: number | null;
  rating_surcharge: number | null;
  settlement_status: string;
  earned_at: string;
  merchant_paid_at?: string | null;
};

function hkDateParts(date = new Date()) {
  const s = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d, dateStr: s };
}

function hkMonthStart(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}-01T00:00:00+08:00`;
}

function hkNextMonthStart(y: number, m: number) {
  if (m === 12) return hkMonthStart(y + 1, 1);
  return hkMonthStart(y, m + 1);
}

function formatMonthLabel(y: number, m: number) {
  return `${y}年${m}月`;
}

function mapRow(r: EarningRow, merchantDirect: boolean): CourierEarningItem {
  const merchantPaidAt = r.merchant_paid_at ?? null;
  return {
    id: r.id,
    order_id: r.order_id,
    job_type: r.job_type,
    amount: Number(r.amount),
    gross_amount: r.gross_amount != null ? Number(r.gross_amount) : null,
    platform_fee_amount:
      r.platform_fee_amount != null ? Number(r.platform_fee_amount) : null,
    base_amount: r.base_amount != null ? Number(r.base_amount) : null,
    rating_surcharge: r.rating_surcharge != null ? Number(r.rating_surcharge) : null,
    settlement_status: r.settlement_status as CourierEarningItem['settlement_status'],
    earned_at: r.earned_at,
    merchant_paid_at: merchantPaidAt,
    can_report_unpaid:
      merchantDirect && !merchantPaidAt && r.settlement_status !== 'reversed',
  };
}

export async function getCourierEarningsView(courierId: string): Promise<CourierEarningsView> {
  await syncPendingCourierEarnings({ courierId });

  const supabase = await createClient();
  const merchantDirect = await isMerchantDirectPayout();
  const { y, m, dateStr } = hkDateParts();
  const monthStart = hkMonthStart(y, m);
  const monthEnd = hkNextMonthStart(y, m);

  let prevY = y;
  let prevM = m - 1;
  if (prevM < 1) {
    prevM = 12;
    prevY -= 1;
  }
  const prevMonthStart = hkMonthStart(prevY, prevM);
  const prevMonthEnd = monthStart;

  const [earningsRes, profileRes, lastMonthSettledRes, recentRes] = await Promise.all([
    (supabase as any)
      .from('courier_delivery_earnings')
      .select('amount, settlement_status, earned_at')
      .eq('courier_id', courierId)
      .neq('settlement_status', 'reversed')
      .gte('earned_at', monthStart)
      .lt('earned_at', monthEnd),
    supabase
      .from('courier_profiles')
      .select('customer_rating_avg, customer_rating_count')
      .eq('user_id', courierId)
      .maybeSingle(),
    (supabase as any)
      .from('courier_delivery_earnings')
      .select('amount')
      .eq('courier_id', courierId)
      .eq('settlement_status', 'settled')
      .gte('earned_at', prevMonthStart)
      .lt('earned_at', prevMonthEnd),
    (supabase as any)
      .from('courier_delivery_earnings')
      .select(
        'id, order_id, job_type, amount, gross_amount, platform_fee_amount, base_amount, rating_surcharge, settlement_status, earned_at, merchant_paid_at'
      )
      .eq('courier_id', courierId)
      .neq('settlement_status', 'reversed')
      .order('earned_at', { ascending: false })
      .limit(40),
  ]);

  const monthRows = (earningsRes.data || []) as {
    amount: number;
    settlement_status: string;
    earned_at: string;
  }[];

  let todayAmount = 0;
  let todayCount = 0;
  let monthPendingAmount = 0;
  let monthPendingCount = 0;
  let monthSettledAmount = 0;
  let monthSettledCount = 0;

  for (const row of monthRows) {
    const amt = Number(row.amount);
    const earnedDay = new Date(row.earned_at).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Hong_Kong',
    });
    if (earnedDay === dateStr) {
      todayAmount += amt;
      todayCount += 1;
    }
    if (row.settlement_status === 'pending') {
      monthPendingAmount += amt;
      monthPendingCount += 1;
    } else if (row.settlement_status === 'settled') {
      monthSettledAmount += amt;
      monthSettledCount += 1;
    }
  }

  const lastMonthRows = (lastMonthSettledRes.data || []) as { amount: number }[];
  const lastSettledAmount =
    lastMonthRows.length > 0
      ? roundMoney(lastMonthRows.reduce((s, r) => s + Number(r.amount), 0))
      : null;

  const profile = profileRes.data as {
    customer_rating_avg: number | null;
    customer_rating_count: number;
  } | null;

  const summary: CourierEarningsSummary = {
    todayAmount: roundMoney(todayAmount),
    todayCount,
    monthPendingAmount: roundMoney(monthPendingAmount),
    monthPendingCount,
    monthSettledAmount: roundMoney(monthSettledAmount),
    monthSettledCount,
    lastSettledAmount,
    lastSettledLabel: lastSettledAmount != null ? formatMonthLabel(prevY, prevM) : null,
    customerRatingAvg:
      profile?.customer_rating_avg != null ? Number(profile.customer_rating_avg) : null,
    customerRatingCount: profile?.customer_rating_count ?? 0,
  };

  const recent = ((recentRes.data || []) as EarningRow[]).map((r) =>
    mapRow(r, merchantDirect)
  );

  return { summary, recent };
}
