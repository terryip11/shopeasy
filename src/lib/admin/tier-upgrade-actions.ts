import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/lib/admin/merchant-actions';
import type { MerchantTier } from '@/lib/merchant/tier-config';
import { isHigherTier } from '@/lib/merchant/tier-config';
import { activateMerchantTier } from '@/lib/merchant/subscription';

export async function getPendingTierUpgrades() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('merchant_tier_upgrades')
    .select('*, merchants (name, slug, tier)')
    .eq('status', 'pending')
    .order('applied_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPendingTierUpgradeForMerchant(merchantId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('merchant_tier_upgrades')
    .select('id, requested_tier, note, applied_at, status')
    .eq('merchant_id', merchantId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    requested_tier: MerchantTier;
    note: string | null;
    applied_at: string;
    status: string;
  } | null;
}

export async function approveTierUpgrade(upgradeId: string, adminId: string) {
  const supabase = createAdminClient();

  const { data: upgrade, error: fetchError } = await supabase
    .from('merchant_tier_upgrades')
    .select('*')
    .eq('id', upgradeId)
    .single();

  if (fetchError || !upgrade) throw new Error('申請不存在');

  const row = upgrade as {
    id: string;
    merchant_id: string;
    user_id: string;
    status: string;
    current_tier: MerchantTier;
    requested_tier: MerchantTier;
  };

  if (row.status !== 'pending') throw new Error('僅待審核申請可通過');

  const { data: merchant } = await supabase
    .from('merchants')
    .select('tier')
    .eq('id', row.merchant_id)
    .single();

  const currentTier = (merchant as { tier: MerchantTier } | null)?.tier ?? row.current_tier;

  if (!isHigherTier(row.requested_tier, currentTier)) {
    throw new Error('申請等級必須高於商家目前等級');
  }

  if (row.requested_tier !== 'premium' && row.requested_tier !== 'vip') {
    throw new Error('無效的升級等級');
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await activateMerchantTier({
    merchantId: row.merchant_id,
    userId: row.user_id,
    tier: row.requested_tier,
    stripeSubscriptionId: `fps_sub_${row.id}`,
    periodEnd,
    stripeInvoiceId: `fps_inv_${row.id}`,
    paymentType: 'initial',
  });

  await (supabase as any)
    .from('merchant_tier_upgrades')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', upgradeId);

  await logAdminAction(adminId, 'merchant.tier_upgrade.approve', 'merchant_tier_upgrades', upgradeId, {
    merchant_id: row.merchant_id,
    tier: row.requested_tier,
    payment: 'fps',
  });
}

export async function rejectTierUpgrade(upgradeId: string, adminId: string, reason?: string) {
  const supabase = createAdminClient();

  const { data: upgrade } = await supabase
    .from('merchant_tier_upgrades')
    .select('status')
    .eq('id', upgradeId)
    .single();

  if (!upgrade) throw new Error('申請不存在');
  if ((upgrade as { status: string }).status !== 'pending') {
    throw new Error('僅待審核申請可拒絕');
  }

  await (supabase as any)
    .from('merchant_tier_upgrades')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      reject_reason: reason || null,
    })
    .eq('id', upgradeId);

  await logAdminAction(adminId, 'merchant.tier_upgrade.reject', 'merchant_tier_upgrades', upgradeId, {
    reason,
  });
}
