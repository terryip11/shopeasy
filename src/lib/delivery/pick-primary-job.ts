import type { Database } from '@/types/database';

type DeliveryJobRow = Pick<
  Database['public']['Tables']['delivery_jobs']['Row'],
  | 'id'
  | 'order_id'
  | 'job_type'
  | 'status'
  | 'courier_id'
  | 'assigned_at'
  | 'delivered_at'
  | 'created_at'
>;

const STATUS_RANK: Record<string, number> = {
  delivered: 50,
  picked_up: 40,
  assigned: 30,
  pending: 10,
  failed: 0,
  cancelled: 0,
};

/** 商家列表應顯示進度最高、最有代表性的配送任務（非最後一筆或最新一筆） */
export function compareDeliveryJobsForDisplay(a: DeliveryJobRow, b: DeliveryJobRow): number {
  const rankA = STATUS_RANK[a.status] ?? 0;
  const rankB = STATUS_RANK[b.status] ?? 0;
  if (rankB !== rankA) return rankB - rankA;

  const courierA = a.courier_id ? 1 : 0;
  const courierB = b.courier_id ? 1 : 0;
  if (courierB !== courierA) return courierB - courierA;

  const timeA = a.delivered_at || a.assigned_at || a.created_at || '';
  const timeB = b.delivered_at || b.assigned_at || b.created_at || '';
  return timeB.localeCompare(timeA);
}

export function pickPrimaryDeliveryJob<T extends DeliveryJobRow>(jobs: T[]): T | null {
  if (jobs.length === 0) return null;
  return [...jobs].sort(compareDeliveryJobsForDisplay)[0] ?? null;
}

export function pickPrimaryDeliveryJobsPerOrder<T extends DeliveryJobRow>(
  jobs: T[]
): Record<string, T> {
  const byOrder: Record<string, T[]> = {};
  for (const job of jobs) {
    if (job.status === 'cancelled' || job.status === 'failed') continue;
    (byOrder[job.order_id] ??= []).push(job);
  }

  const map: Record<string, T> = {};
  for (const [orderId, list] of Object.entries(byOrder)) {
    const picked = pickPrimaryDeliveryJob(list);
    if (picked) map[orderId] = picked;
  }
  return map;
}
