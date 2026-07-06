import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { calculateCourierPayout } from '@/lib/delivery/courier-payout';
import { roundMoney } from '@/lib/finance/config';
import {
  resolveCourierPlatformSplit,
  COURIER_PAYOUT_SNAPSHOT_VERSION,
  getCourierPlatformFeeRate,
  splitCourierPlatformFee,
} from '@/lib/finance/platform-settings';

/** 配送完成後記錄配送員工資（冪等） */
export async function recordCourierDeliveryEarning(
  deliveryJobId: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('id')
    .eq('delivery_job_id', deliveryJobId)
    .maybeSingle();

  if (existing) return { ok: true, skipped: true };

  const { data: job, error: jobError } = await supabase
    .from('delivery_jobs')
    .select(
      'id, order_id, courier_id, job_type, status, delivered_at, courier_fee_base, courier_fee_surcharge, courier_fee_total, courier_payout_net, platform_fee_rate, platform_fee_amount, payout_snapshot_version'
    )
    .eq('id', deliveryJobId)
    .single();

  if (jobError || !job) {
    return { ok: false, error: jobError?.message || '配送任務不存在' };
  }

  const row = job as {
    id: string;
    order_id: string;
    courier_id: string | null;
    job_type: string;
    status: string;
    delivered_at: string | null;
    courier_fee_base: number | null;
    courier_fee_surcharge: number | null;
    courier_fee_total: number | null;
    courier_payout_net: number | null;
    platform_fee_rate: number | null;
    platform_fee_amount: number | null;
    payout_snapshot_version: number | null;
  };

  if (row.status !== 'delivered' || !row.courier_id) {
    return { ok: false, error: '僅已完成配送可記帳' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('merchant_id, user_id')
    .eq('id', row.order_id)
    .single();

  const orderRow = order as { merchant_id: string | null; user_id: string | null } | null;
  const merchantId = orderRow?.merchant_id;
  if (!merchantId) {
    return { ok: false, error: '訂單缺少商家' };
  }

  let base = row.courier_fee_base != null ? Number(row.courier_fee_base) : null;
  let ratingSurcharge =
    row.courier_fee_surcharge != null ? Number(row.courier_fee_surcharge) : 0;
  let gross = row.courier_fee_total != null ? Number(row.courier_fee_total) : null;
  let platformFeeRate: number;
  let platformFee: number;
  let net: number;

  if (gross == null) {
    const payout = await calculateCourierPayout({
      merchantId,
      jobType: row.job_type,
      courierId: row.courier_id,
      orderId: row.order_id,
    });
    base = payout.base;
    ratingSurcharge = payout.ratingSurcharge;
    gross = payout.gross;
    platformFeeRate = payout.platformFeeRate;
    platformFee = payout.platformFee;
    net = payout.total;
  } else {
    base = base ?? roundMoney(gross - ratingSurcharge);
    const split = await resolveCourierPlatformSplit(gross, row);
    platformFeeRate = split.platformFeeRate;
    platformFee = split.platformFee;
    net = split.net;
  }

  const earnedAt = row.delivered_at || new Date().toISOString();

  const { error: insertError } = await (supabase as any).from('courier_delivery_earnings').insert({
    delivery_job_id: row.id,
    order_id: row.order_id,
    courier_id: row.courier_id,
    job_type: row.job_type,
    amount: net,
    gross_amount: gross,
    platform_fee_rate: platformFeeRate,
    platform_fee_amount: platformFee,
    base_amount: base,
    rating_surcharge: ratingSurcharge,
    settlement_status: 'pending',
    earned_at: earnedAt,
  });

  if (insertError) {
    if (insertError.message?.includes('courier_delivery_earnings')) {
      return {
        ok: false,
        error: '請先執行 supabase/migrate-v20-courier-payroll.sql',
      };
    }
    return { ok: false, error: insertError.message };
  }

  await recordDeliveryCostOnLedger(row.order_id, gross);

  if (row.courier_fee_total == null || row.payout_snapshot_version !== COURIER_PAYOUT_SNAPSHOT_VERSION) {
    await (supabase as any)
      .from('delivery_jobs')
      .update({
        courier_fee_base: base,
        courier_fee_surcharge: ratingSurcharge,
        courier_fee_total: gross,
        courier_payout_net: net,
        platform_fee_rate: platformFeeRate,
        platform_fee_amount: platformFee,
        payout_snapshot_version: COURIER_PAYOUT_SNAPSHOT_VERSION,
      })
      .eq('id', row.id);
  }

  return { ok: true };
}

/** 記錄商家應付配送成本（不從商家應得扣款） */
async function recordDeliveryCostOnLedger(orderId: string, deliveryCost: number) {
  const supabase = createAdminClient();
  await (supabase as any)
    .from('order_ledger')
    .update({ delivery_cost: deliveryCost })
    .eq('order_id', orderId)
    .neq('settlement_status', 'reversed');
}

/** 退款時沖銷配送員記帳 */
export async function reverseCourierEarningsForOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  await (supabase as any)
    .from('courier_delivery_earnings')
    .update({ settlement_status: 'reversed' })
    .eq('order_id', orderId)
    .eq('settlement_status', 'pending');
}

type PendingEarningRow = {
  id: string;
  delivery_job_id: string;
  amount: number;
  gross_amount: number | null;
  platform_fee_amount: number | null;
  platform_fee_rate: number | null;
};

type JobPayoutRow = {
  id: string;
  courier_fee_total: number | null;
  payout_snapshot_version: number | null;
  courier_payout_net: number | null;
  platform_fee_rate: number | null;
  platform_fee_amount: number | null;
};

/**
 * 將待結算收入與平台抽成對齊：
 * - 接單已鎖定快照的任務 → 以任務快照為準
 * - 其餘待結算 → 依目前（或指定）平台比例重算
 */
export async function syncPendingCourierEarnings(options?: {
  courierId?: string;
  rate?: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const rate = options?.rate ?? (await getCourierPlatformFeeRate());

  let earningsQuery = (supabase as any)
    .from('courier_delivery_earnings')
    .select(
      'id, delivery_job_id, amount, gross_amount, platform_fee_amount, platform_fee_rate'
    )
    .eq('settlement_status', 'pending');

  if (options?.courierId) {
    earningsQuery = earningsQuery.eq('courier_id', options.courierId);
  }

  const { data: earnings } = await earningsQuery;
  const rows = (earnings || []) as PendingEarningRow[];
  if (rows.length === 0) return;

  const jobIds = [...new Set(rows.map((r) => r.delivery_job_id))];
  const { data: jobs } = await supabase
    .from('delivery_jobs')
    .select(
      'id, courier_fee_total, payout_snapshot_version, courier_payout_net, platform_fee_rate, platform_fee_amount'
    )
    .in('id', jobIds);

  const jobMap = new Map(((jobs || []) as JobPayoutRow[]).map((j) => [j.id, j]));

  for (const earning of rows) {
    const job = jobMap.get(earning.delivery_job_id);
    const lockedAtClaim =
      job?.payout_snapshot_version === COURIER_PAYOUT_SNAPSHOT_VERSION &&
      job.courier_payout_net != null &&
      job.platform_fee_rate != null;

    if (lockedAtClaim && job) {
      const expectedGross = Number(job.courier_fee_total ?? earning.gross_amount ?? earning.amount);
      const expectedNet = Number(job.courier_payout_net);
      const expectedRate = Number(job.platform_fee_rate);
      const expectedFee =
        job.platform_fee_amount != null
          ? Number(job.platform_fee_amount)
          : roundMoney(expectedGross - expectedNet);

      if (
        Number(earning.amount) === expectedNet &&
        Number(earning.platform_fee_amount ?? 0) === expectedFee &&
        Math.abs(Number(earning.platform_fee_rate ?? 0) - expectedRate) < 0.0001
      ) {
        continue;
      }

      await (supabase as any)
        .from('courier_delivery_earnings')
        .update({
          amount: expectedNet,
          gross_amount: expectedGross,
          platform_fee_rate: expectedRate,
          platform_fee_amount: expectedFee,
        })
        .eq('id', earning.id);
      continue;
    }

    const gross = Number(
      earning.gross_amount ??
        job?.courier_fee_total ??
        (earning.platform_fee_amount != null && Number(earning.platform_fee_amount) > 0
          ? Number(earning.amount) + Number(earning.platform_fee_amount)
          : earning.amount)
    );
    const split = splitCourierPlatformFee(gross, rate);

    if (
      Number(earning.amount) === split.net &&
      Number(earning.platform_fee_amount ?? 0) === split.platformFee &&
      Math.abs(Number(earning.platform_fee_rate ?? 0) - split.platformFeeRate) < 0.0001
    ) {
      continue;
    }

    await (supabase as any)
      .from('courier_delivery_earnings')
      .update({
        amount: split.net,
        gross_amount: split.gross,
        platform_fee_rate: split.platformFeeRate,
        platform_fee_amount: split.platformFee,
      })
      .eq('id', earning.id);
  }
}
