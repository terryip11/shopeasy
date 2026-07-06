import type { DeliveryJobStatus, DeliveryJobType } from '@/types/database';
import type { UserCapability } from '@/lib/auth/capabilities';

export const DELIVERY_JOB_STATUS_LABELS: Record<DeliveryJobStatus, string> = {
  pending: '待接單',
  assigned: '已接單',
  picked_up: '運送中',
  delivered: '已送達',
  failed: '配送失敗',
  cancelled: '已取消',
};

export const DELIVERY_JOB_STATUS_STYLES: Record<DeliveryJobStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const COURIER_STATUS_LABELS = {
  pending: '審核中',
  active: '已啟用',
  rejected: '已拒絕',
  suspended: '已停用',
} as const;

export const VEHICLE_LABELS = {
  walk: '步行',
  bicycle: '單車',
  motorcycle: '電單車',
  van: '貨車',
} as const;

export function mapClaimError(message: string): string {
  const map: Record<string, string> = {
    JOB_ALREADY_CLAIMED: '此單已被其他配送員接走',
    JOB_NOT_FOUND: '任務不存在',
    MISSING_CAPABILITY: '您沒有此類型配送權限',
    COURIER_NOT_ACTIVE: '配送員帳號未啟用',
    COURIER_OFFLINE: '請先切換為上線狀態',
    UNAUTHORIZED: '請先登入',
  };
  return map[message] || message;
}

export type CourierApplyInput = {
  phone: string;
  vehicle_type: 'walk' | 'bicycle' | 'motorcycle' | 'van';
  preferred_job_type: 'food' | 'parcel';
  zone_ids: string[];
  hkid_image_url: string;
  declaration_accepted: true;
};

export function capabilitiesFromPreferred(
  preferred: CourierApplyInput['preferred_job_type'] | 'both'
): UserCapability[] {
  if (preferred === 'both') return ['food_courier', 'parcel_courier'];
  if (preferred === 'food') return ['food_courier'];
  return ['parcel_courier'];
}
