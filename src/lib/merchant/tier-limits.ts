import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  getDefaultTierLimits,
  type MerchantTier,
  type TierLimit,
  type TierLimitsMap,
} from '@/lib/merchant/tier-config';

export const MERCHANT_TIER_LIMITS_KEY = 'merchant_tier_limits';

export type { TierLimit, TierLimitsMap };

function parsePositiveInt(raw: unknown, fallback: number, max = 9999): number {
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.min(Math.floor(num), max);
}

function parseTierLimit(raw: unknown, fallback: TierLimit): TierLimit {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const row = raw as Record<string, unknown>;
  return {
    maxProducts: parsePositiveInt(row.maxProducts, fallback.maxProducts, 9999),
    maxImagesPerProduct: parsePositiveInt(row.maxImagesPerProduct, fallback.maxImagesPerProduct, 50),
  };
}

export function parseTierLimitsValue(raw: unknown): TierLimitsMap {
  const defaults = getDefaultTierLimits();
  if (!raw || typeof raw !== 'object') return defaults;
  const map = raw as Record<string, unknown>;
  return {
    basic: parseTierLimit(map.basic, defaults.basic),
    premium: parseTierLimit(map.premium, defaults.premium),
    vip: parseTierLimit(map.vip, defaults.vip),
  };
}

export function validateTierLimits(limits: TierLimitsMap): string | null {
  const tiers: MerchantTier[] = ['basic', 'premium', 'vip'];
  for (const tier of tiers) {
    const row = limits[tier];
    if (!Number.isFinite(row.maxProducts) || row.maxProducts < 1 || row.maxProducts > 9999) {
      return '商品上限須為 1–9999';
    }
    if (
      !Number.isFinite(row.maxImagesPerProduct) ||
      row.maxImagesPerProduct < 1 ||
      row.maxImagesPerProduct > 50
    ) {
      return '每件商品圖片上限須為 1–50';
    }
  }
  if (limits.premium.maxProducts < limits.basic.maxProducts) {
    return '高級商家商品上限不可低於普通商家';
  }
  if (limits.vip.maxProducts < limits.premium.maxProducts) {
    return '尊貴商家商品上限不可低於高級商家';
  }
  if (limits.premium.maxImagesPerProduct < limits.basic.maxImagesPerProduct) {
    return '高級商家圖片上限不可低於普通商家';
  }
  if (limits.vip.maxImagesPerProduct < limits.premium.maxImagesPerProduct) {
    return '尊貴商家圖片上限不可低於高級商家';
  }
  return null;
}

export async function getTierLimits(): Promise<TierLimitsMap> {
  const defaults = getDefaultTierLimits();
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', MERCHANT_TIER_LIMITS_KEY)
    .maybeSingle();

  if (!data?.value) return defaults;
  return parseTierLimitsValue(data.value);
}

export async function setTierLimits(
  limits: TierLimitsMap,
  adminId: string
): Promise<{ error: string | null; limits: TierLimitsMap }> {
  const normalized: TierLimitsMap = {
    basic: {
      maxProducts: Math.floor(limits.basic.maxProducts),
      maxImagesPerProduct: Math.floor(limits.basic.maxImagesPerProduct),
    },
    premium: {
      maxProducts: Math.floor(limits.premium.maxProducts),
      maxImagesPerProduct: Math.floor(limits.premium.maxImagesPerProduct),
    },
    vip: {
      maxProducts: Math.floor(limits.vip.maxProducts),
      maxImagesPerProduct: Math.floor(limits.vip.maxImagesPerProduct),
    },
  };

  const validationError = validateTierLimits(normalized);
  if (validationError) {
    return { error: validationError, limits: normalized };
  }

  const supabase = createAdminClient();
  const { error } = await (supabase as any).from('platform_settings').upsert({
    key: MERCHANT_TIER_LIMITS_KEY,
    value: normalized,
    updated_at: new Date().toISOString(),
    updated_by: adminId,
  });

  if (error) {
    if (error.message?.includes('platform_settings')) {
      return {
        error: '請執行 supabase/migrate-v57-merchant-tier-limits.sql',
        limits: normalized,
      };
    }
    return { error: error.message, limits: normalized };
  }

  return { error: null, limits: normalized };
}
