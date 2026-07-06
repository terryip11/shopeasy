import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { getMerchantTierInfo, type MerchantTier } from '@/lib/merchant/tiers';

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先建立並通過審核的店鋪' }, { status: 400 });
  }

  const tier = ((merchant.tier as MerchantTier) || 'basic');
  const info = await getMerchantTierInfo(merchant.id, tier, {
    tier_period_end: merchant.tier_period_end,
    stripe_subscription_id: merchant.stripe_subscription_id,
  });

  return NextResponse.json(info);
}
