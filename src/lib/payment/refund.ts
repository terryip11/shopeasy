import 'server-only';

/**
 * Stripe 退款處理
 */

import { getStripe } from '@/lib/payment/stripe';

export async function resolvePaymentIntentId(stripeId: string | null): Promise<string | null> {
  if (!stripeId) return null;
  if (stripeId.startsWith('pi_')) return stripeId;

  const stripe = getStripe();

  if (stripeId.startsWith('cs_')) {
    const session = await stripe.checkout.sessions.retrieve(stripeId);
    const pi = session.payment_intent;
    return typeof pi === 'string' ? pi : pi?.id ?? null;
  }

  return stripeId;
}

export async function createStripeRefund(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}
