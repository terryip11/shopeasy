/**
 * 用戶能力（與 profiles.role 分離，可多選）
 */

export type UserCapability = 'food_courier' | 'parcel_courier';

export type DeliveryJobType = 'food' | 'parcel';

export const CAPABILITY_LABELS: Record<UserCapability, string> = {
  food_courier: '送餐員',
  parcel_courier: '送貨員',
};

export const JOB_TYPE_LABELS: Record<DeliveryJobType, string> = {
  food: '外賣配送',
  parcel: '貨物配送',
};

export function capabilityForJobType(jobType: DeliveryJobType): UserCapability {
  return jobType === 'food' ? 'food_courier' : 'parcel_courier';
}

export function jobTypeForCapability(capability: UserCapability): DeliveryJobType {
  return capability === 'food_courier' ? 'food' : 'parcel';
}
