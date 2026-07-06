import { NextRequest, NextResponse } from 'next/server';

import { getStripe } from '@/lib/payment/stripe';
import { markOrdersPaid } from '@/lib/orders/mark-paid';
import { reverseOrderLedgerByPaymentId } from '@/lib/finance/ledger';
import {
  activateMerchantTier,
  downgradeMerchantTier,
  logRenewalPayment,
  tierFromStripeMetadata,
} from '@/lib/merchant/subscription';
import { getTierMonthlyPriceHkd } from '@/lib/merchant/tier-config';

async function markOrdersRefunded(paymentIntentId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  await (supabase as any)
    .from('orders')
    .update({ status: 'refunded' })
    .eq('stripe_payment_id', paymentIntentId)
    .in('status', ['paid', 'shipped', 'refund_requested']);
}

async function handleMerchantTierCheckoutCompleted(session: {
  id: string;
  metadata?: Record<string, string> | null;
  subscription?: string | { id: string } | null;
}) {
  const { fulfillMerchantTierFromCheckoutSession } = await import('@/lib/merchant/subscription');
  const result = await fulfillMerchantTierFromCheckoutSession(session.id);
  if (!result.ok) {
    console.error('[webhook] 商家等級升級失敗:', result.error, session.id);
  }
}

async function handleInvoicePaid(invoice: {
  id: string;
  billing_reason?: string | null;
  subscription?: string | { id: string } | null;
  amount_paid?: number;
  currency?: string;
}) {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const meta = subscription.metadata || {};
  if (meta.type !== 'merchant_tier') return;

  const merchantId = meta.merchant_id;
  const userId = meta.user_id;
  const tier = tierFromStripeMetadata(meta.requested_tier);

  if (!merchantId || !userId || !tier) return;

  if (invoice.billing_reason === 'subscription_create') {
    const { fulfillMerchantTierFromCheckoutSession } = await import('@/lib/merchant/subscription');
    const sessions = await stripe.checkout.sessions.list({
      subscription: subscriptionId,
      limit: 1,
    });
    const checkoutSession = sessions.data[0];
    if (checkoutSession?.id) {
      await fulfillMerchantTierFromCheckoutSession(checkoutSession.id);
    } else {
      await activateMerchantTier({
        merchantId,
        userId,
        tier,
        stripeSubscriptionId: subscriptionId,
        periodEnd: new Date(subscription.current_period_end * 1000),
        stripeInvoiceId: invoice.id,
        paymentType: 'initial',
      });
    }
    return;
  }

  const amountHkd =
    invoice.currency === 'hkd' && invoice.amount_paid
      ? invoice.amount_paid / 100
      : getTierMonthlyPriceHkd(tier);

  await logRenewalPayment({
    merchantId,
    userId,
    tier,
    amountHkd,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    periodEnd: new Date(subscription.current_period_end * 1000),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: '缺少 webhook 簽名' }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook 簽名驗證失敗:', err);
    return NextResponse.json({ error: '簽名驗證失敗' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.metadata?.type === 'merchant_tier') {
      await handleMerchantTierCheckoutCompleted(session);
    } else {
      const orderIds = session.metadata?.order_ids?.split(',').filter(Boolean) || [];
      if (orderIds.length > 0) {
        const paymentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.id;
        await markOrdersPaid(orderIds, paymentId);
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    if (session.metadata?.type === 'merchant_tier') {
      // 無需處理
    } else {
      const orderIds = session.metadata?.order_ids?.split(',').filter(Boolean) || [];
      if (orderIds.length > 0) {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabase = createAdminClient();
        await (supabase as any)
          .from('orders')
          .update({ status: 'cancelled' })
          .in('id', orderIds)
          .eq('status', 'pending');
      }
    }
  }

  if (event.type === 'invoice.paid') {
    await handleInvoicePaid(event.data.object);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    if (subscription.metadata?.type === 'merchant_tier' && subscription.metadata.merchant_id) {
      await downgradeMerchantTier(subscription.metadata.merchant_id, subscription.id);
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;

    if (paymentIntentId) {
      await markOrdersRefunded(paymentIntentId);
      await reverseOrderLedgerByPaymentId(paymentIntentId);
    }
  }

  return NextResponse.json({ received: true });
}
