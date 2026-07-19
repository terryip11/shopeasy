import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export {
  PLATFORM_PAYOUT_HOLDER_KEY,
  PLATFORM_PAYOUT_FPS_ID_KEY,
  PLATFORM_PAYOUT_INSTRUCTIONS_KEY,
  type PlatformPayoutSettings,
} from '@/lib/finance/platform-payout-types';
import {
  PLATFORM_PAYOUT_HOLDER_KEY,
  PLATFORM_PAYOUT_FPS_ID_KEY,
  PLATFORM_PAYOUT_INSTRUCTIONS_KEY,
  type PlatformPayoutSettings,
} from '@/lib/finance/platform-payout-types';

function readString(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw == null) return '';
  return String(raw).trim();
}

export function validatePlatformFpsPayout(input: PlatformPayoutSettings): string | null {
  const accountHolder = input.accountHolder.trim();
  const fpsId = input.fpsId.trim();

  if (!accountHolder) return '請填寫 FPS 收款人姓名';
  if (accountHolder.length < 2) return '收款人姓名至少 2 個字元';
  if (!fpsId) return '請填寫轉數快 FPS 識別碼';
  if (fpsId.length < 4) return 'FPS 識別碼格式不正確';

  return null;
}

export async function getPlatformPayoutSettings(): Promise<PlatformPayoutSettings> {
  const supabase = createAdminClient();
  const keys = [
    PLATFORM_PAYOUT_HOLDER_KEY,
    PLATFORM_PAYOUT_FPS_ID_KEY,
    PLATFORM_PAYOUT_INSTRUCTIONS_KEY,
  ];

  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', keys);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  return {
    accountHolder: readString(map.get(PLATFORM_PAYOUT_HOLDER_KEY)),
    fpsId: readString(map.get(PLATFORM_PAYOUT_FPS_ID_KEY)),
    instructions: readString(map.get(PLATFORM_PAYOUT_INSTRUCTIONS_KEY)),
  };
}

export async function setPlatformPayoutSettings(
  input: PlatformPayoutSettings,
  adminId: string
): Promise<{ error: string | null; settings: PlatformPayoutSettings }> {
  const validationError = validatePlatformFpsPayout(input);
  if (validationError) {
    return { error: validationError, settings: input };
  }

  const next: PlatformPayoutSettings = {
    accountHolder: input.accountHolder.trim(),
    fpsId: input.fpsId.trim(),
    instructions: input.instructions.trim(),
  };

  const supabase = createAdminClient();
  const rows = [
    { key: PLATFORM_PAYOUT_HOLDER_KEY, value: next.accountHolder },
    { key: PLATFORM_PAYOUT_FPS_ID_KEY, value: next.fpsId },
    { key: PLATFORM_PAYOUT_INSTRUCTIONS_KEY, value: next.instructions },
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
          error: '請執行 supabase/migrate-v44-platform-payout.sql',
          settings: next,
        };
      }
      return { error: error.message, settings: next };
    }
  }

  return { error: null, settings: next };
}

export function isPlatformPayoutConfigured(settings: PlatformPayoutSettings): boolean {
  return validatePlatformFpsPayout(settings) === null;
}
