import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_MONETIZATION_MODE,
  DEFAULT_PAYOUT_MODEL,
  LOCKED_PLATFORM_MONETIZATION,
  MONETIZATION_MODE_KEY,
  PAYOUT_MODEL_KEY,
  type PlatformMonetizationSettings,
} from '@/lib/finance/monetization-types';

export {
  MONETIZATION_MODES,
  PAYOUT_MODELS,
  MONETIZATION_MODE_LABELS,
  PAYOUT_MODEL_LABELS,
  DEFAULT_MONETIZATION_MODE,
  DEFAULT_PAYOUT_MODEL,
  LOCKED_PLATFORM_MONETIZATION,
  type MonetizationMode,
  type PayoutModel,
  type PlatformMonetizationSettings,
} from '@/lib/finance/monetization-types';

/** 產品已鎖定：一律回傳訂閱為主 + 商家直付 */
export async function getPlatformMonetizationSettings(): Promise<PlatformMonetizationSettings> {
  return { ...LOCKED_PLATFORM_MONETIZATION };
}

/**
 * 將資料庫設定強制同步為鎖定值（供 Admin 頁／API 呼叫）
 */
export async function ensureLockedMonetizationSettings(
  adminId: string | null
): Promise<{ error: string | null; settings: PlatformMonetizationSettings; updated: boolean }> {
  const settings: PlatformMonetizationSettings = { ...LOCKED_PLATFORM_MONETIZATION };
  const supabase = createAdminClient();

  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', [MONETIZATION_MODE_KEY, PAYOUT_MODEL_KEY]);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  const modeRaw = String(map.get(MONETIZATION_MODE_KEY) ?? '').replace(/^"|"$/g, '');
  const payoutRaw = String(map.get(PAYOUT_MODEL_KEY) ?? '').replace(/^"|"$/g, '');
  const alreadyLocked =
    modeRaw === settings.mode && payoutRaw === settings.payoutModel;

  if (alreadyLocked) {
    return { error: null, settings, updated: false };
  }

  const rows = [
    { key: MONETIZATION_MODE_KEY, value: settings.mode },
    { key: PAYOUT_MODEL_KEY, value: settings.payoutModel },
  ];

  for (const row of rows) {
    const { error } = await (supabase as any).from('platform_settings').upsert({
      key: row.key,
      value: row.value,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });
    if (error) {
      if (error.message?.includes('platform_settings')) {
        return {
          error: '請執行 supabase/migrate-v53-monetization-mode.sql',
          settings,
          updated: false,
        };
      }
      return { error: error.message, settings, updated: false };
    }
  }

  return { error: null, settings, updated: true };
}

/** @deprecated 產品已鎖定；呼叫等同 ensureLockedMonetizationSettings */
export async function setPlatformMonetizationSettings(
  _input: PlatformMonetizationSettings,
  adminId: string
): Promise<{ error: string | null; settings: PlatformMonetizationSettings }> {
  const result = await ensureLockedMonetizationSettings(adminId);
  return { error: result.error, settings: result.settings };
}

/** 訂閱為主：不收訂單 GMV 平台費（已鎖定） */
export async function isSubscriptionOnlyMode(): Promise<boolean> {
  return true;
}

/** 有效訂單平台費率（訂閱為主時為 0） */
export async function getEffectivePlatformFeeRate(
  _tier?: string | null
): Promise<number> {
  return 0;
}

export async function isMerchantDirectPayout(): Promise<boolean> {
  return true;
}

export function defaultMonetizationSettings(): PlatformMonetizationSettings {
  return { ...LOCKED_PLATFORM_MONETIZATION };
}
