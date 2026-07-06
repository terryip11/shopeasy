import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getMerchantCourierFee } from '@/lib/merchant/courier-fees';
import { roundMoney } from '@/lib/finance/config';
import {
  getCourierPlatformFeeRate,
  splitCourierPlatformFee,
  COURIER_PAYOUT_SNAPSHOT_VERSION,
} from '@/lib/finance/platform-settings';

export type CourierRatingSurchargeRule = {
  id: string;
  /** 配送員歷史平均評分須達到此門檻（含）才可獲得加價 */
  rating_below: number;
  surcharge_hkd: number;
  label: string | null;
  sort_order: number;
  enabled: boolean;
};

export type CourierPayoutBreakdown = {
  base: number;
  ratingSurcharge: number;
  /** 基本工資＋高評加價（平台抽成前） */
  gross: number;
  platformFeeRate: number;
  platformFee: number;
  /** 配送員實收（扣除平台服務費後） */
  total: number;
  courierRatingAvg: number | null;
  courierRatingCount: number;
  surchargeLabel: string | null;
};

export async function getCourierCustomerRatingStats(courierId: string): Promise<{
  avg: number | null;
  count: number;
}> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('courier_profiles')
    .select('customer_rating_avg, customer_rating_count')
    .eq('user_id', courierId)
    .maybeSingle();

  const row = data as {
    customer_rating_avg: number | null;
    customer_rating_count: number;
  } | null;
  return {
    avg: row?.customer_rating_avg != null ? Number(row.customer_rating_avg) : null,
    count: row?.customer_rating_count ?? 0,
  };
}

export async function getRatingSurchargeRules(): Promise<CourierRatingSurchargeRule[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('courier_buyer_rating_surcharges')
    .select('id, rating_below, surcharge_hkd, label, sort_order, enabled')
    .eq('enabled', true)
    .order('rating_below', { ascending: true });

  return ((data || []) as CourierRatingSurchargeRule[]).map((r) => ({
    ...r,
    rating_below: Number(r.rating_below),
    surcharge_hkd: Number(r.surcharge_hkd),
  }));
}

/** 歷史平均評分達門檻時加價；多條符合取最高加價。尚無客戶評分不加價。 */
export function computeRatingSurcharge(
  courierAvg: number | null,
  courierCount: number,
  rules: CourierRatingSurchargeRule[]
): { surcharge: number; label: string | null } {
  if (courierCount === 0 || courierAvg == null || rules.length === 0) {
    return { surcharge: 0, label: null };
  }

  let surcharge = 0;
  let label: string | null = null;

  for (const rule of rules) {
    if (courierAvg >= rule.rating_below && rule.surcharge_hkd > surcharge) {
      surcharge = rule.surcharge_hkd;
      label = rule.label;
    }
  }

  return { surcharge: roundMoney(surcharge), label };
}

export async function calculateCourierPayout(input: {
  merchantId: string;
  jobType: string;
  courierId: string;
  orderId?: string;
}): Promise<CourierPayoutBreakdown> {
  const [base, courierStats, rules, platformFeeRate] = await Promise.all([
    getMerchantCourierFee(input.merchantId, input.jobType, input.orderId),
    getCourierCustomerRatingStats(input.courierId),
    getRatingSurchargeRules(),
    getCourierPlatformFeeRate(),
  ]);

  const { surcharge, label } = computeRatingSurcharge(
    courierStats.avg,
    courierStats.count,
    rules
  );

  const split = splitCourierPlatformFee(base + surcharge, platformFeeRate);

  return {
    base,
    ratingSurcharge: surcharge,
    gross: split.gross,
    platformFeeRate: split.platformFeeRate,
    platformFee: split.platformFee,
    total: split.net,
    courierRatingAvg: courierStats.avg,
    courierRatingCount: courierStats.count,
    surchargeLabel: label,
  };
}

export async function snapshotJobCourierPayout(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from('delivery_jobs')
    .select('id, order_id, job_type, courier_id')
    .eq('id', jobId)
    .single();

  if (!job) return;

  const row = job as {
    id: string;
    order_id: string;
    job_type: string;
    courier_id: string | null;
  };
  if (!row.courier_id) return;

  const { data: order } = await supabase
    .from('orders')
    .select('merchant_id')
    .eq('id', row.order_id)
    .single();

  const orderRow = order as { merchant_id: string | null } | null;
  if (!orderRow?.merchant_id) return;

  const payout = await calculateCourierPayout({
    merchantId: orderRow.merchant_id,
    jobType: row.job_type,
    courierId: row.courier_id,
    orderId: row.order_id,
  });

  await (supabase as any)
    .from('delivery_jobs')
    .update({
      courier_fee_base: payout.base,
      courier_fee_surcharge: payout.ratingSurcharge,
      courier_fee_total: payout.gross,
      courier_payout_net: payout.total,
      platform_fee_rate: payout.platformFeeRate,
      platform_fee_amount: payout.platformFee,
      payout_snapshot_version: COURIER_PAYOUT_SNAPSHOT_VERSION,
    })
    .eq('id', jobId);
}
