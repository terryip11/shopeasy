import 'server-only';

import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import { parseOrderItems } from '@/lib/orders/types';
import { resolveOrderPaymentMethod } from '@/lib/orders/resume-payment-client';
import {
  getStripe,
  getAppUrl,
  isStripePaymentsEnabled,
  STRIPE_PAYMENTS_UNAVAILABLE_REASON,
  stripeProductImageUrl,
} from '@/lib/payment/stripe';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import type { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'];

export async function buildResumePaymentResponse(
  order: Order,
  userEmail: string | undefined,
  paymentMethod?: MerchantPaymentMethod
) {
  if (order.status !== 'pending') {
    throw new Error('此訂單不是待付款狀態');
  }

  const method = paymentMethod ?? resolveOrderPaymentMethod(order);
  const appUrl = getAppUrl();

  if (isManualPaymentMethod(method)) {
    return {
      type: 'manual' as const,
      paymentMethod: method,
      redirectUrl: `${appUrl}/checkout/pay?orders=${order.id}`,
    };
  }

  if (!isStripePaymentsEnabled()) {
    throw new Error(STRIPE_PAYMENTS_UNAVAILABLE_REASON);
  }

  const stripe = getStripe();
  const items = parseOrderItems(order.items);

  if (order.stripe_payment_id?.startsWith('cs_')) {
    try {
      await stripe.checkout.sessions.expire(order.stripe_payment_id);
    } catch (err) {
      console.warn('[resume-pay] expire old session:', err);
    }
  }

  const lineItems = items.map((item) => {
    const image = stripeProductImageUrl(item.image);
    return {
      price_data: {
        currency: 'hkd',
        product_data: {
          name: item.name,
          ...(image ? { images: [image] } : {}),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: lineItems,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/orders/${order.id}`,
    metadata: {
      user_id: order.user_id,
      order_ids: order.id,
    },
  });

  return {
    type: 'stripe' as const,
    paymentMethod: method,
    url: session.url,
    sessionId: session.id,
  };
}
