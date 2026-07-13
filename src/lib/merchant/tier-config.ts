export type MerchantTier = 'basic' | 'premium' | 'vip';

export const MERCHANT_TIER_LABELS: Record<MerchantTier, string> = {
  basic: '普通商家',
  premium: '高級商家',
  vip: '尊貴商家',
};

export const MERCHANT_TIER_LIMITS: Record<
  MerchantTier,
  { maxProducts: number | null; maxImagesPerProduct: number }
> = {
  basic: { maxProducts: 3, maxImagesPerProduct: 2 },
  premium: { maxProducts: 20, maxImagesPerProduct: 5 },
  vip: { maxProducts: 50, maxImagesPerProduct: 8 },
};

/** 月費（HKD）預設值；後台可透過 platform_settings 覆寫 */
export const TIER_MONTHLY_PRICE_HKD: Record<'premium' | 'vip', number> = {
  premium: 88,
  vip: 128,
};

export type TierMonthlyPrices = {
  premium: number;
  vip: number;
};

export function getDefaultTierMonthlyPrices(): TierMonthlyPrices {
  return {
    premium: TIER_MONTHLY_PRICE_HKD.premium,
    vip: TIER_MONTHLY_PRICE_HKD.vip,
  };
}

export function getTierMonthlyPriceHkd(tier: 'premium' | 'vip'): number {
  return TIER_MONTHLY_PRICE_HKD[tier];
}

const TIER_RANK: Record<MerchantTier, number> = {
  basic: 0,
  premium: 1,
  vip: 2,
};

export function isHigherTier(requested: MerchantTier, current: MerchantTier): boolean {
  return TIER_RANK[requested] > TIER_RANK[current];
}

export function getUpgradeOptions(current: MerchantTier): MerchantTier[] {
  if (current === 'basic') return ['premium', 'vip'];
  if (current === 'premium') return ['vip'];
  return [];
}

export function checkImageCount(tier: MerchantTier, imageCount: number) {
  const max = MERCHANT_TIER_LIMITS[tier]?.maxImagesPerProduct ?? 2;
  if (imageCount > max) {
    return {
      ok: false as const,
      error: `${MERCHANT_TIER_LABELS[tier]} 每件商品最多 ${max} 張圖片，請升級商家等級`,
    };
  }
  return { ok: true as const };
}
