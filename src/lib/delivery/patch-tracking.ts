import type { MerchantOrderTracking } from '@/lib/merchant/delivery-tracking-types';

export type DeliveryJobRealtimeRow = {
  id: string;
  status?: string;
  courier_id?: string | null;
  courier_lat?: number | string | null;
  courier_lng?: number | string | null;
  courier_location_at?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 用 Realtime payload 局部更新追蹤狀態，避免每次打完整 API */
export function patchTrackingFromJobRow(
  prev: MerchantOrderTracking,
  row: DeliveryJobRealtimeRow
): { tracking: MerchantOrderTracking; needsFullRefresh: boolean } {
  if (!prev.job || prev.job.id !== row.id) {
    return { tracking: prev, needsFullRefresh: true };
  }

  if (row.courier_id && !prev.job.courier && row.status === 'assigned') {
    return { tracking: prev, needsFullRefresh: true };
  }

  return {
    tracking: {
      ...prev,
      job: {
        ...prev.job,
        status: row.status ?? prev.job.status,
        courier_lat: num(row.courier_lat) ?? prev.job.courier_lat,
        courier_lng: num(row.courier_lng) ?? prev.job.courier_lng,
        courier_location_at: row.courier_location_at ?? prev.job.courier_location_at,
        assigned_at: row.assigned_at ?? prev.job.assigned_at,
        picked_up_at: row.picked_up_at ?? prev.job.picked_up_at,
        delivered_at: row.delivered_at ?? prev.job.delivered_at,
      },
    },
    needsFullRefresh: false,
  };
}
