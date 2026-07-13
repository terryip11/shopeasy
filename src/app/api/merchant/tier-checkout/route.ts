import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getActiveMerchantForUser } from '@/lib/auth/server';
import {
  getStripe,
  getAppUrl,
  isStripePaymentsEnabled,
  STRIPE_PAYMENTS_UNAVAILABLE_REASON,
} from '@/lib/payment/stripe';
import {
  getUpgradeOptions,
  MERCHANT_TIER_LABELS,
  type MerchantTier,
} from '@/lib/merchant/tier-config';
import { getTierMonthlyPrices } from '@/lib/merchant/tier-pricing';

const bodySchema = z.object({
  requested_tier: z.enum(['premium', 'vip']),
});

/** 建立 Stripe 月費訂閱結帳，付款成功後自動升級 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  const merchant = await getActiveMerchantForUser();

  if (!user || !merchant) {
    return NextResponse.json({ error: '請先登入並通過商家審核' }, { status: 401 });
  }

  try {
    const { requested_tier } = bodySchema.parse(await request.json());
    const currentTier = ((merchant.tier as MerchantTier) || 'basic');

    if (!getUpgradeOptions(currentTier).includes(requested_tier)) {
      return NextResponse.json(
        {
          error: `無法從${MERCHANT_TIER_LABELS[currentTier]}升級至${MERCHANT_TIER_LABELS[requested_tier]}`,
        },
        { status: 400 }
      );
    }

    const tierPrices = await getTierMonthlyPrices();
    const priceHkd = tierPrices[requested_tier];

    if (!isStripePaymentsEnabled()) {
      return NextResponse.json({ error: STRIPE_PAYMENTS_UNAVAILABLE_REASON }, { status: 503 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'hkd',
            product_data: {
              name: `ShopEasy ${MERCHANT_TIER_LABELS[requested_tier]} 月費`,
              description: `每月自動續訂，享有更高商品與圖片上限`,
            },
            unit_amount: Math.round(priceHkd * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?tier_upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?tier_cancelled=1`,
      metadata: {
        type: 'merchant_tier',
        merchant_id: merchant.id,
        user_id: user.id,
        requested_tier,
      },
      subscription_data: {
        metadata: {
          type: 'merchant_tier',
          merchant_id: merchant.id,
          user_id: user.id,
          requested_tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error('Tier checkout error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
