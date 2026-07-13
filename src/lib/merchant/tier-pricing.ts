import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import {
  getDefaultTierMonthlyPrices,
  type MerchantTier,
  type TierMonthlyPrices,
} from '@/lib/merchant/tier-config';

export const MERCHANT_TIER_PRICE_PREMIUM_KEY = 'merchant_tier_monthly_price_premium';
export const MERCHANT_TIER_PRICE_VIP_KEY = 'merchant_tier_monthly_price_vip';

export type { TierMonthlyPrices };

function parsePriceSetting(raw: unknown, fallback: number): number {
  if (raw == null) return fallback;
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number((raw as { amount?: number }).amount ?? raw);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return roundMoney(num);
}

export async function getTierMonthlyPrices(): Promise<TierMonthlyPrices> {
  const defaults = getDefaultTierMonthlyPrices();
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', [MERCHANT_TIER_PRICE_PREMIUM_KEY, MERCHANT_TIER_PRICE_VIP_KEY]);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  return {
    premium: parsePriceSetting(map.get(MERCHANT_TIER_PRICE_PREMIUM_KEY), defaults.premium),
    vip: parsePriceSetting(map.get(MERCHANT_TIER_PRICE_VIP_KEY), defaults.vip),
  };
}

export async function setTierMonthlyPrices(
  prices: TierMonthlyPrices,
  adminId: string
): Promise<{ error: string | null; prices: TierMonthlyPrices }> {
  if (!Number.isFinite(prices.premium) || prices.premium <= 0 || prices.premium > 99999) {
    return { error: '高級商家月費須為 1–99999', prices };
  }
  if (!Number.isFinite(prices.vip) || prices.vip <= 0 || prices.vip > 99999) {
    return { error: '尊貴商家月費須為 1–99999', prices };
  }
  if (prices.vip < prices.premium) {
    return { error: '尊貴商家月費不可低於高級商家月費', prices };
  }

  const normalized: TierMonthlyPrices = {
    premium: roundMoney(prices.premium),
    vip: roundMoney(prices.vip),
  };

  const supabase = createAdminClient();
  const rows = [
    { key: MERCHANT_TIER_PRICE_PREMIUM_KEY, value: normalized.premium },
    { key: MERCHANT_TIER_PRICE_VIP_KEY, value: normalized.vip },
  ];

  for (const row of rows) {
    const { error } = await (supabase as any)
      .from('platform_settings')
      .upsert({
        key: row.key,
        value: row.value,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      });

    if (error) {
      if (error.message?.includes('platform_settings')) {
        return {
          error: '請執行 supabase/migrate-v40-merchant-tier-pricing.sql',
          prices: normalized,
        };
      }
      return { error: error.message, prices: normalized };
    }
  }

  return { error: null, prices: normalized };
}

export function formatTierPriceSummary(prices: TierMonthlyPrices): string {
  return `高級 HK$${prices.premium} · 尊貴 HK$${prices.vip}`;
}

export type PaidMerchantTier = Extract<MerchantTier, 'premium' | 'vip'>;
