import type { DeliveryJobType } from '@/types/database';

export type MerchantBusinessType = 'food' | 'retail';

export const MERCHANT_BUSINESS_TYPES = ['food', 'retail'] as const;

export const BUSINESS_TYPE_LABELS: Record<MerchantBusinessType, string> = {
  food: '餐飲／外賣',
  retail: '零售／網店',
};

export function normalizeBusinessType(
  value: string | null | undefined
): MerchantBusinessType {
  return value === 'food' ? 'food' : 'retail';
}

/** 依商家業務類型決定預設配送任務類型 */
export function defaultJobTypeForBusinessType(
  businessType: string | null | undefined
): DeliveryJobType {
  return normalizeBusinessType(businessType) === 'food' ? 'food' : 'parcel';
}
