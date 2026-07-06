import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getActiveMerchantForUser } from '@/lib/auth/server';
import { activateMerchantTier } from '@/lib/merchant/subscription';
import {
  getUpgradeOptions,
  MERCHANT_TIER_LABELS,
  type MerchantTier,
} from '@/lib/merchant/tier-config';

const bodySchema = z.object({
  requested_tier: z.enum(['premium', 'vip']),
});

import { isDevOnlyRouteAllowed } from '@/lib/dev/route-guard';

/** 開發用：無 Stripe webhook 時直接升級（僅本機） */
export async function POST(request: NextRequest) {
  if (!isDevOnlyRouteAllowed('ALLOW_DEV_TIER_ACTIVATE')) {
    return NextResponse.json({ error: '僅開發環境可用' }, { status: 403 });
  }

  const user = await getAuthUser();
  const merchant = await getActiveMerchantForUser();
  if (!user || !merchant) {
    return NextResponse.json({ error: '請先登入並通過商家審核' }, { status: 401 });
  }

  try {
    const { requested_tier } = bodySchema.parse(await request.json());
    const currentTier = ((merchant.tier as MerchantTier) || 'basic');

    if (!getUpgradeOptions(currentTier).includes(requested_tier)) {
      return NextResponse.json({ error: '無法升級至該等級' }, { status: 400 });
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await activateMerchantTier({
      merchantId: merchant.id,
      userId: user.id,
      tier: requested_tier,
      stripeSubscriptionId: `dev_sub_${Date.now()}`,
      periodEnd,
      stripeInvoiceId: `dev_inv_${Date.now()}`,
      paymentType: 'initial',
    });

    return NextResponse.json({
      ok: true,
      tier: requested_tier,
      message: `已升級為${MERCHANT_TIER_LABELS[requested_tier]}（開發模式，未經 Stripe 收款）`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
