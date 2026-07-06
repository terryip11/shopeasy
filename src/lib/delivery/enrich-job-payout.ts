import 'server-only';

import type { Database } from '@/types/database';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateCourierPayout } from '@/lib/delivery/courier-payout';
import { resolveCourierPlatformSplit } from '@/lib/finance/platform-settings';

type DeliveryJob = Database['public']['Tables']['delivery_jobs']['Row'];

export type DeliveryJobWithPayout = DeliveryJob & {
  payout_base: number;
  payout_surcharge: number;
  payout_gross: number;
  payout_platform_fee: number;
  /** 配送員實收 */
  payout_total: number;
  courier_rating_avg: number | null;
  courier_rating_count: number;
  payout_note: string | null;
};

export async function enrichDeliveryJobsWithPayout(
  jobs: DeliveryJob[],
  viewingCourierId: string
): Promise<DeliveryJobWithPayout[]> {
  if (jobs.length === 0) return [];

  const supabase = createAdminClient();
  const orderIds = [...new Set(jobs.map((j) => j.order_id))];

  const { data: orders } = await supabase
    .from('orders')
    .select('id, merchant_id')
    .in('id', orderIds);

  const orderMap = new Map(
    ((orders || []) as { id: string; merchant_id: string | null }[]).map((o) => [o.id, o])
  );

  const results: DeliveryJobWithPayout[] = [];

  for (const job of jobs) {
    const courierId = job.courier_id ?? viewingCourierId;

    if (
      job.courier_fee_total != null &&
      job.courier_fee_base != null &&
      Number(job.courier_fee_total) > 0 &&
      job.courier_id
    ) {
      const gross = Number(job.courier_fee_total);
      const jobRow = job as DeliveryJob & {
        courier_payout_net?: number | null;
        platform_fee_amount?: number | null;
        platform_fee_rate?: number | null;
        payout_snapshot_version?: number | null;
      };
      const split = await resolveCourierPlatformSplit(gross, jobRow);
      const net = split.net;
      const platformFee = split.platformFee;

      results.push({
        ...job,
        payout_base: Number(job.courier_fee_base),
        payout_surcharge: Number(job.courier_fee_surcharge ?? 0),
        payout_gross: gross,
        payout_platform_fee: platformFee,
        payout_total: net,
        courier_rating_avg: null,
        courier_rating_count: 0,
        payout_note: job.courier_fee_surcharge ? '已含高評加價' : null,
      });
      continue;
    }

    const order = orderMap.get(job.order_id);
    if (!order?.merchant_id) {
      results.push({
        ...job,
        payout_base: 0,
        payout_surcharge: 0,
        payout_gross: 0,
        payout_platform_fee: 0,
        payout_total: 0,
        courier_rating_avg: null,
        courier_rating_count: 0,
        payout_note: null,
      });
      continue;
    }

    const payout = await calculateCourierPayout({
      merchantId: order.merchant_id,
      jobType: job.job_type,
      courierId,
      orderId: job.order_id,
    });

    const note =
      payout.ratingSurcharge > 0
        ? payout.surchargeLabel || `高評加價 +HK$${payout.ratingSurcharge}`
        : payout.courierRatingCount === 0
          ? '尚無客戶評分（達標後可獲加價）'
          : null;

    results.push({
      ...job,
      payout_base: payout.base,
      payout_surcharge: payout.ratingSurcharge,
      payout_gross: payout.gross,
      payout_platform_fee: payout.platformFee,
      payout_total: payout.total,
      courier_rating_avg: payout.courierRatingAvg,
      courier_rating_count: payout.courierRatingCount,
      payout_note: note,
    });
  }

  return results;
}
