import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { payoutFromPromoterProfile, type PromoterPayoutDetails } from '@/lib/promoter/payout';

export async function getPromoterProfileForUser(
  userId: string
): Promise<PromoterPayoutDetails | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('promoter_profiles')
    .select('payout_account_holder, payout_fps_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return payoutFromPromoterProfile(data);
}

export async function upsertPromoterProfile(
  userId: string,
  payout: PromoterPayoutDetails
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await (supabase as any).from('promoter_profiles').upsert(
    {
      user_id: userId,
      payout_account_holder: payout.accountHolder.trim(),
      payout_fps_id: payout.fpsId.trim(),
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    if (error.message?.includes('promoter_profiles')) {
      return { error: '請執行 supabase/migrate-v43-promoter-payout.sql' };
    }
    return { error: error.message };
  }

  return { error: null };
}
