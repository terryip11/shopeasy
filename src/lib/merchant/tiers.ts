import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  MERCHANT_TIER_LABELS,
  MERCHANT_TIER_LIMITS,
  getUpgradeOptions,
  type MerchantTier,
} from '@/lib/merchant/tier-config';

export type { MerchantTier } from '@/lib/merchant/tier-config';
export {
  MERCHANT_TIER_LABELS,
  MERCHANT_TIER_LIMITS,
  TIER_MONTHLY_PRICE_HKD,
  getTierMonthlyPriceHkd,
  isHigherTier,
  getUpgradeOptions,
  checkImageCount,
} from '@/lib/merchant/tier-config';

export type MerchantTierInfo = {
  tier: MerchantTier;
  tierLabel: string;
  limits: (typeof MERCHANT_TIER_LIMITS)[MerchantTier];
  productCount: number;
  upgradeOptions: MerchantTier[];
  subscription: {
    active: boolean;
    periodEnd: string | null;
    stripeSubscriptionId: string | null;
  };
};

export async function getMerchantTierInfo(
  merchantId: string,
  tier: MerchantTier,
  subscriptionFields?: {
    tier_period_end?: string | null;
    stripe_subscription_id?: string | null;
  }
) {
  const supabase = await createClient();

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  const safeTier = (['basic', 'premium', 'vip'].includes(tier) ? tier : 'basic') as MerchantTier;

  return {
    tier: safeTier,
    tierLabel: MERCHANT_TIER_LABELS[safeTier],
    limits: MERCHANT_TIER_LIMITS[safeTier],
    productCount: count || 0,
    upgradeOptions: getUpgradeOptions(safeTier),
    subscription: {
      active: Boolean(subscriptionFields?.stripe_subscription_id),
      periodEnd: subscriptionFields?.tier_period_end ?? null,
      stripeSubscriptionId: subscriptionFields?.stripe_subscription_id ?? null,
    },
  } satisfies MerchantTierInfo;
}

export type ProductLimitCheck = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export async function checkCanAddProduct(
  merchantId: string,
  tier: MerchantTier
): Promise<ProductLimitCheck> {
  const limits = MERCHANT_TIER_LIMITS[tier]?.maxProducts;
  if (limits === null) return { ok: true };

  const supabase = await createClient();
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  if ((count || 0) >= limits) {
    return {
      ok: false,
      error: `已達 ${MERCHANT_TIER_LABELS[tier]} 商品上限（${limits} 件），請升級商家等級`,
    };
  }
  return { ok: true };
}
