import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export const AFFILIATE_ENABLED_KEY = 'affiliate_enabled';
export const AFFILIATE_PLATFORM_CUT_KEY = 'affiliate_platform_cut_rate';
export const AFFILIATE_ATTRIBUTION_DAYS_KEY = 'affiliate_attribution_days';
export const AFFILIATE_MIN_COMMISSION_KEY = 'affiliate_min_commission_rate';
export const AFFILIATE_MAX_COMMISSION_KEY = 'affiliate_max_commission_rate';

export const DEFAULT_AFFILIATE_PLATFORM_CUT = 0.2;
export const DEFAULT_AFFILIATE_ATTRIBUTION_DAYS = 30;
export const DEFAULT_MIN_COMMISSION_RATE = 0.05;
export const DEFAULT_MAX_COMMISSION_RATE = 0.3;

export type AffiliatePlatformSettings = {
  enabled: boolean;
  /** 訂閱為主：固定為 0，平台不抽分享佣金 */
  platformCutRate: number;
  attributionDays: number;
  minCommissionRate: number;
  maxCommissionRate: number;
};

function parseBool(raw: unknown, fallback: boolean): boolean {
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  return fallback;
}

function parseRate(raw: unknown, fallback: number): number {
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number(raw);
  if (!Number.isFinite(num) || num < 0 || num > 1) return fallback;
  return num;
}

function parseDays(raw: unknown, fallback: number): number {
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number(raw);
  if (!Number.isFinite(num) || num < 1 || num > 365) return fallback;
  return Math.floor(num);
}

export async function getAffiliatePlatformSettings(): Promise<AffiliatePlatformSettings> {
  const supabase = createAdminClient();
  const keys = [
    AFFILIATE_ENABLED_KEY,
    AFFILIATE_ATTRIBUTION_DAYS_KEY,
    AFFILIATE_MIN_COMMISSION_KEY,
    AFFILIATE_MAX_COMMISSION_KEY,
  ];

  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', keys);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  return {
    enabled: parseBool(map.get(AFFILIATE_ENABLED_KEY), true),
    platformCutRate: 0,
    attributionDays: parseDays(
      map.get(AFFILIATE_ATTRIBUTION_DAYS_KEY),
      DEFAULT_AFFILIATE_ATTRIBUTION_DAYS
    ),
    minCommissionRate: parseRate(
      map.get(AFFILIATE_MIN_COMMISSION_KEY),
      DEFAULT_MIN_COMMISSION_RATE
    ),
    maxCommissionRate: parseRate(
      map.get(AFFILIATE_MAX_COMMISSION_KEY),
      DEFAULT_MAX_COMMISSION_RATE
    ),
  };
}

export async function setAffiliatePlatformSettings(
  input: Partial<AffiliatePlatformSettings>,
  adminId: string
): Promise<{ error: string | null; settings: AffiliatePlatformSettings }> {
  const current = await getAffiliatePlatformSettings();

  const next: AffiliatePlatformSettings = {
    enabled: input.enabled ?? current.enabled,
    platformCutRate: 0,
    attributionDays: input.attributionDays ?? current.attributionDays,
    minCommissionRate: input.minCommissionRate ?? current.minCommissionRate,
    maxCommissionRate: input.maxCommissionRate ?? current.maxCommissionRate,
  };

  if (next.minCommissionRate > next.maxCommissionRate) {
    return { error: '最低佣金不可高於最高佣金', settings: next };
  }

  const supabase = createAdminClient();
  const rows: { key: string; value: unknown }[] = [
    { key: AFFILIATE_ENABLED_KEY, value: next.enabled },
    { key: AFFILIATE_ATTRIBUTION_DAYS_KEY, value: next.attributionDays },
    { key: AFFILIATE_MIN_COMMISSION_KEY, value: next.minCommissionRate },
    { key: AFFILIATE_MAX_COMMISSION_KEY, value: next.maxCommissionRate },
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
          error: '請執行 supabase/migrate-v42-affiliate.sql',
          settings: next,
        };
      }
      return { error: error.message, settings: next };
    }
  }

  return { error: null, settings: next };
}

export function clampCommissionRate(
  rate: number,
  settings: Pick<AffiliatePlatformSettings, 'minCommissionRate' | 'maxCommissionRate'>
): number {
  return Math.min(settings.maxCommissionRate, Math.max(settings.minCommissionRate, rate));
}
