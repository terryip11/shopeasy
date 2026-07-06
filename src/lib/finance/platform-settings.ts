import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';

export const DEFAULT_COURIER_PLATFORM_FEE_RATE = 0.1;
export const COURIER_PLATFORM_FEE_SETTING_KEY = 'courier_platform_fee_rate';
export const COURIER_MIN_BASE_FEE_FOOD_KEY = 'courier_min_base_fee_food';
export const COURIER_MIN_BASE_FEE_PARCEL_KEY = 'courier_min_base_fee_parcel';
/** 接單快照版本：1 表示接單時已鎖定平台抽成 */
export const COURIER_PAYOUT_SNAPSHOT_VERSION = 1;

export type CourierPlatformFeeSplit = {
  gross: number;
  platformFeeRate: number;
  platformFee: number;
  net: number;
};

export function splitCourierPlatformFee(
  gross: number,
  rate: number
): CourierPlatformFeeSplit {
  const clampedRate = Math.min(1, Math.max(0, rate));
  const platformFee = roundMoney(gross * clampedRate);
  const net = roundMoney(gross - platformFee);
  return {
    gross: roundMoney(gross),
    platformFeeRate: clampedRate,
    platformFee,
    net,
  };
}

export type CourierMinBaseFees = {
  food: number;
  parcel: number;
};

function parseNumericSetting(raw: unknown, fallback: number): number {
  if (raw == null) return fallback;
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number((raw as { amount?: number }).amount ?? raw);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return roundMoney(num);
}

export function applyCourierMinBaseFee(
  resolvedBase: number,
  jobType: string,
  mins: CourierMinBaseFees
): number {
  const floor = jobType === 'parcel' ? mins.parcel : mins.food;
  if (floor <= 0) return roundMoney(resolvedBase);
  return roundMoney(Math.max(resolvedBase, floor));
}

export async function getCourierMinBaseFees(): Promise<CourierMinBaseFees> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', [COURIER_MIN_BASE_FEE_FOOD_KEY, COURIER_MIN_BASE_FEE_PARCEL_KEY]);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  return {
    food: parseNumericSetting(map.get(COURIER_MIN_BASE_FEE_FOOD_KEY), 0),
    parcel: parseNumericSetting(map.get(COURIER_MIN_BASE_FEE_PARCEL_KEY), 0),
  };
}

export async function setCourierMinBaseFees(
  fees: CourierMinBaseFees,
  adminId: string
): Promise<{ error: string | null; fees: CourierMinBaseFees }> {
  if (!Number.isFinite(fees.food) || fees.food < 0 || fees.food > 99999) {
    return { error: '送餐最低工資須為 0–99999', fees };
  }
  if (!Number.isFinite(fees.parcel) || fees.parcel < 0 || fees.parcel > 99999) {
    return { error: '送貨最低工資須為 0–99999', fees };
  }

  const normalized: CourierMinBaseFees = {
    food: roundMoney(fees.food),
    parcel: roundMoney(fees.parcel),
  };

  const supabase = createAdminClient();
  const rows = [
    { key: COURIER_MIN_BASE_FEE_FOOD_KEY, value: normalized.food },
    { key: COURIER_MIN_BASE_FEE_PARCEL_KEY, value: normalized.parcel },
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
          error: '請執行 supabase/migrate-v26-courier-platform-fee.sql 與 migrate-v30-courier-min-base-fee.sql',
          fees: normalized,
        };
      }
      return { error: error.message, fees: normalized };
    }
  }

  return { error: null, fees: normalized };
}

export async function getCourierPlatformFeeRate(): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', COURIER_PLATFORM_FEE_SETTING_KEY)
    .maybeSingle();

  if (!data?.value) return DEFAULT_COURIER_PLATFORM_FEE_RATE;

  const raw = data.value;
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number((raw as { rate?: number }).rate ?? raw);

  if (!Number.isFinite(num) || num < 0 || num > 1) {
    return DEFAULT_COURIER_PLATFORM_FEE_RATE;
  }
  return num;
}

export async function setCourierPlatformFeeRate(
  rate: number,
  adminId: string
): Promise<{ error: string | null; rate: number }> {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return { error: '比例須介於 0% 至 100%', rate };
  }

  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('platform_settings')
    .upsert({
      key: COURIER_PLATFORM_FEE_SETTING_KEY,
      value: rate,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });

  if (error) {
    if (error.message?.includes('platform_settings')) {
      return {
        error: '請執行 supabase/migrate-v26-courier-platform-fee.sql',
        rate,
      };
    }
    return { error: error.message, rate };
  }

  return { error: null, rate };
}

type CourierPayoutSnapshotFields = {
  payout_snapshot_version?: number | null;
  courier_payout_net?: number | null;
  platform_fee_rate?: number | null;
  platform_fee_amount?: number | null;
};

/** 接單時已鎖定抽成則用快照，否則用目前平台比例（送達記帳／預估顯示） */
export async function resolveCourierPlatformSplit(
  gross: number,
  job: CourierPayoutSnapshotFields
): Promise<CourierPlatformFeeSplit> {
  if (
    job.payout_snapshot_version === COURIER_PAYOUT_SNAPSHOT_VERSION &&
    job.courier_payout_net != null &&
    job.platform_fee_rate != null
  ) {
    const net = Number(job.courier_payout_net);
    const rate = Number(job.platform_fee_rate);
    const platformFee =
      job.platform_fee_amount != null
        ? Number(job.platform_fee_amount)
        : roundMoney(gross - net);
    return {
      gross: roundMoney(gross),
      platformFeeRate: rate,
      platformFee,
      net,
    };
  }

  const rate = await getCourierPlatformFeeRate();
  return splitCourierPlatformFee(gross, rate);
}
