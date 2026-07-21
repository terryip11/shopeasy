import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_LANDING_VARIANT,
  LANDING_VARIANT_SETTING_KEY,
  isLandingVariantId,
  parseLandingVariant,
  type LandingVariantId,
} from '@/lib/marketing/landing-theme-types';

export {
  LANDING_VARIANTS,
  LANDING_VARIANT_META,
  LANDING_VARIANT_SETTING_KEY,
  DEFAULT_LANDING_VARIANT,
  isLandingVariantId,
  parseLandingVariant,
  type LandingVariantId,
  type LandingVariantMeta,
} from '@/lib/marketing/landing-theme-types';

export async function getLandingVariant(): Promise<LandingVariantId> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', LANDING_VARIANT_SETTING_KEY)
    .maybeSingle();

  return parseLandingVariant(data?.value);
}

export async function setLandingVariant(
  variant: LandingVariantId,
  adminId: string
): Promise<{ error: string | null; variant: LandingVariantId }> {
  if (!isLandingVariantId(variant)) {
    return { error: '無效的首頁版面', variant: DEFAULT_LANDING_VARIANT };
  }

  const supabase = createAdminClient();
  const { error } = await (supabase as any).from('platform_settings').upsert({
    key: LANDING_VARIANT_SETTING_KEY,
    value: variant,
    updated_at: new Date().toISOString(),
    updated_by: adminId,
  });

  if (error) {
    if (error.message?.includes('platform_settings')) {
      return {
        error: '請執行 supabase/migrate-v52-landing-variant.sql',
        variant,
      };
    }
    return { error: error.message, variant };
  }

  return { error: null, variant };
}
