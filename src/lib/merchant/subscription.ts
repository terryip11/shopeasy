import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { MerchantTier } from '@/lib/merchant/tier-config';
import { getTierMonthlyPriceHkd } from '@/lib/merchant/tier-config';
import { parseMonthParam } from '@/lib/finance/month-bounds';

type PaidTier = 'premium' | 'vip';

export async function activateMerchantTier(params: {
  merchantId: string;
  userId: string;
  tier: PaidTier;
  stripeSubscriptionId: string;
  periodEnd: Date;
  stripeCheckoutSessionId?: string;
  stripeInvoiceId?: string;
  paymentType?: 'initial' | 'renewal';
}) {
  const supabase = createAdminClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('stripe_subscription_id, tier')
    .eq('id', params.merchantId)
    .single();

  const oldSubId = (merchant as { stripe_subscription_id: string | null } | null)
    ?.stripe_subscription_id;

  if (
    oldSubId &&
    oldSubId !== params.stripeSubscriptionId &&
    params.paymentType === 'initial'
  ) {
    const { getStripe } = await import('@/lib/payment/stripe');
    try {
      await getStripe().subscriptions.cancel(oldSubId);
    } catch (e) {
      console.warn('[subscription] 取消舊訂閱失敗:', e);
    }
  }

  await (supabase as any)
    .from('merchants')
    .update({
      tier: params.tier,
      stripe_subscription_id: params.stripeSubscriptionId,
      tier_period_end: params.periodEnd.toISOString(),
    })
    .eq('id', params.merchantId);

  if (params.stripeInvoiceId) {
    const { data: existing } = await supabase
      .from('merchant_subscription_payments')
      .select('id')
      .eq('stripe_invoice_id', params.stripeInvoiceId)
      .maybeSingle();

    if (!existing) {
      await (supabase as any).from('merchant_subscription_payments').insert({
        merchant_id: params.merchantId,
        user_id: params.userId,
        tier: params.tier,
        amount_hkd: getTierMonthlyPriceHkd(params.tier),
        stripe_checkout_session_id: params.stripeCheckoutSessionId ?? null,
        stripe_subscription_id: params.stripeSubscriptionId,
        stripe_invoice_id: params.stripeInvoiceId,
        payment_type: params.paymentType ?? 'initial',
        status: 'completed',
        paid_at: new Date().toISOString(),
      });
    }
  }
}

export async function downgradeMerchantTier(merchantId: string, stripeSubscriptionId: string) {
  const supabase = createAdminClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, stripe_subscription_id')
    .eq('id', merchantId)
    .single();

  if (!merchant) return;
  if ((merchant as { stripe_subscription_id: string | null }).stripe_subscription_id !== stripeSubscriptionId) {
    return;
  }

  await (supabase as any)
    .from('merchants')
    .update({
      tier: 'basic',
      stripe_subscription_id: null,
      tier_period_end: null,
    })
    .eq('id', merchantId);
}

export async function logRenewalPayment(params: {
  merchantId: string;
  userId: string;
  tier: PaidTier;
  amountHkd: number;
  stripeSubscriptionId: string;
  stripeInvoiceId: string;
  periodEnd: Date;
}) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('merchant_subscription_payments')
    .select('id')
    .eq('stripe_invoice_id', params.stripeInvoiceId)
    .maybeSingle();

  if (existing) return;

  await (supabase as any).from('merchant_subscription_payments').insert({
    merchant_id: params.merchantId,
    user_id: params.userId,
    tier: params.tier,
    amount_hkd: params.amountHkd,
    stripe_subscription_id: params.stripeSubscriptionId,
    stripe_invoice_id: params.stripeInvoiceId,
    payment_type: 'renewal',
    status: 'completed',
    paid_at: new Date().toISOString(),
  });

  await (supabase as any)
    .from('merchants')
    .update({ tier_period_end: params.periodEnd.toISOString() })
    .eq('id', params.merchantId);
}

export type SubscriptionRevenueStats = {
  totalRevenue: number;
  monthRevenue: number;
  activePremium: number;
  activeVip: number;
  recentPayments: Array<{
    id: string;
    merchant_name: string;
    tier: PaidTier;
    amount_hkd: number;
    payment_type: string;
    paid_at: string;
  }>;
};

export async function getSubscriptionRevenueStats(
  monthParam?: string | null
): Promise<SubscriptionRevenueStats> {
  const supabase = createAdminClient();
  const { monthStart, monthEnd } = parseMonthParam(monthParam);

  const [{ data: payments }, { count: premiumCount }, { count: vipCount }] = await Promise.all([
    supabase
      .from('merchant_subscription_payments')
      .select('id, tier, amount_hkd, payment_type, paid_at, merchant_id, merchants(name)')
      .eq('status', 'completed')
      .gte('paid_at', monthStart)
      .lt('paid_at', monthEnd)
      .order('paid_at', { ascending: false })
      .limit(20),
    supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'premium')
      .not('stripe_subscription_id', 'is', null),
    supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'vip')
      .not('stripe_subscription_id', 'is', null),
  ]);

  const monthPayments = (payments || []) as Array<{
    id: string;
    tier: PaidTier;
    amount_hkd: number;
    payment_type: string;
    paid_at: string;
    merchants: { name: string } | null;
  }>;

  const { data: allForTotal } = await supabase
    .from('merchant_subscription_payments')
    .select('amount_hkd, paid_at')
    .eq('status', 'completed');

  const rows = (allForTotal || []) as { amount_hkd: number; paid_at: string }[];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.amount_hkd), 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.amount_hkd), 0);

  return {
    totalRevenue,
    monthRevenue,
    activePremium: premiumCount || 0,
    activeVip: vipCount || 0,
    recentPayments: monthPayments.map((p) => ({
      id: p.id,
      merchant_name: p.merchants?.name || '未知商家',
      tier: p.tier,
      amount_hkd: Number(p.amount_hkd),
      payment_type: p.payment_type,
      paid_at: p.paid_at,
    })),
  };
}

export function tierFromStripeMetadata(value: string | undefined): PaidTier | null {
  if (value === 'premium' || value === 'vip') return value;
  return null;
}

export type FulfillTierResult =
  | { ok: true; tier: PaidTier; alreadyActive: boolean }
  | { ok: false; error: string };

/** 依 Stripe Checkout Session 完成商家等級升級（webhook 與付款回跳共用） */
export async function fulfillMerchantTierFromCheckoutSession(
  sessionId: string,
  expectedUserId?: string
): Promise<FulfillTierResult> {
  const { getStripe } = await import('@/lib/payment/stripe');
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.metadata?.type !== 'merchant_tier') {
    return { ok: false, error: '非商家等級付款' };
  }

  if (session.payment_status !== 'paid') {
    return { ok: false, error: '付款尚未完成' };
  }

  const merchantId = session.metadata.merchant_id;
  const userId = session.metadata.user_id;
  const tier = tierFromStripeMetadata(session.metadata.requested_tier);

  if (!merchantId || !userId || !tier) {
    return { ok: false, error: '付款資料不完整' };
  }

  if (expectedUserId && userId !== expectedUserId) {
    return { ok: false, error: '無權限確認此付款' };
  }

  const supabase = createAdminClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('tier, stripe_subscription_id')
    .eq('id', merchantId)
    .single();

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && typeof session.subscription === 'object'
        ? session.subscription.id
        : null;

  if (!subscriptionId) {
    return { ok: false, error: '訂閱尚未建立，請稍後再試' };
  }

  const row = merchant as { tier: MerchantTier; stripe_subscription_id: string | null } | null;
  if (row?.tier === tier && row?.stripe_subscription_id === subscriptionId) {
    return { ok: true, tier, alreadyActive: true };
  }

  const subscription =
    session.subscription && typeof session.subscription === 'object'
      ? session.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);

  const sub = subscription as { current_period_end: number; latest_invoice?: string | { id: string } | null };
  const periodEnd = new Date(sub.current_period_end * 1000);
  const invoiceId =
    typeof sub.latest_invoice === 'string'
      ? sub.latest_invoice
      : sub.latest_invoice?.id;

  await activateMerchantTier({
    merchantId,
    userId,
    tier,
    stripeSubscriptionId: subscriptionId,
    periodEnd,
    stripeCheckoutSessionId: session.id,
    stripeInvoiceId: invoiceId ?? `session_${session.id}`,
    paymentType: 'initial',
  });

  return { ok: true, tier, alreadyActive: false };
}

/** 同步最近一筆已完成的等級付款（webhook 未到時用） */
export async function syncMerchantTierFromStripe(
  merchantId: string,
  userId: string
): Promise<FulfillTierResult> {
  const { getStripe } = await import('@/lib/payment/stripe');
  const stripe = getStripe();

  const sessions = await stripe.checkout.sessions.list({
    limit: 20,
    status: 'complete',
  });

  const matches = sessions.data
    .filter(
      (s) =>
        s.metadata?.type === 'merchant_tier' &&
        s.metadata?.merchant_id === merchantId &&
        s.metadata?.user_id === userId &&
        s.payment_status === 'paid'
    )
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

  const latest = matches[0];
  if (!latest?.id) {
    return { ok: false, error: '找不到已完成的等級付款記錄' };
  }

  return fulfillMerchantTierFromCheckoutSession(latest.id, userId);
}
