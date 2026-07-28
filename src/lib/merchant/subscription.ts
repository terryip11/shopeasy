import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { MerchantTier } from '@/lib/merchant/tier-config';
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
    params.paymentType === 'initial' &&
    !oldSubId.startsWith('fps_') &&
    !oldSubId.startsWith('dev_sub_')
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
      const { getTierMonthlyPrices } = await import('@/lib/merchant/tier-pricing');
      const prices = await getTierMonthlyPrices();
      const amountHkd = prices[params.tier];

      await (supabase as any).from('merchant_subscription_payments').insert({
        merchant_id: params.merchantId,
        user_id: params.userId,
        tier: params.tier,
        amount_hkd: amountHkd,
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

export type SubscriptionPaymentChannel = 'fps' | 'dev' | 'stripe';

export type SubscriptionExpiryRow = {
  id: string;
  name: string;
  slug: string;
  tier: PaidTier;
  periodEnd: string | null;
  channel: SubscriptionPaymentChannel;
  daysRemaining: number | null;
};

export type SubscriptionRevenueStats = {
  totalRevenue: number;
  monthRevenue: number;
  monthInitialRevenue: number;
  monthRenewalRevenue: number;
  monthInitialCount: number;
  monthRenewalCount: number;
  activePremium: number;
  activeVip: number;
  tierDistribution: {
    basic: number;
    premium: number;
    vip: number;
  };
  pendingUpgradeCount: number;
  expiringSoon: SubscriptionExpiryRow[];
  expired: SubscriptionExpiryRow[];
  recentPayments: Array<{
    id: string;
    merchant_name: string;
    tier: PaidTier;
    amount_hkd: number;
    payment_type: string;
    paid_at: string;
    channel: SubscriptionPaymentChannel;
  }>;
};

export function detectSubscriptionPaymentChannel(
  subscriptionId?: string | null,
  invoiceId?: string | null
): SubscriptionPaymentChannel {
  const id = `${invoiceId || ''}${subscriptionId || ''}`.toLowerCase();
  if (id.includes('fps_')) return 'fps';
  if (id.includes('dev_')) return 'dev';
  return 'stripe';
}

export function subscriptionPaymentChannelLabel(channel: SubscriptionPaymentChannel): string {
  if (channel === 'fps') return 'FPS';
  if (channel === 'dev') return '開發模式';
  return 'Stripe';
}

function daysUntil(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function getSubscriptionRevenueStats(
  monthParam?: string | null
): Promise<SubscriptionRevenueStats> {
  const supabase = createAdminClient();
  const { monthStart, monthEnd } = parseMonthParam(monthParam);
  const now = new Date();
  const soonEnd = new Date(now);
  soonEnd.setDate(soonEnd.getDate() + 14);

  const [
    { data: payments },
    { count: premiumCount },
    { count: vipCount },
    { count: basicCount },
    { count: pendingUpgradeCount },
    { data: paidMerchants },
  ] = await Promise.all([
    supabase
      .from('merchant_subscription_payments')
      .select(
        'id, tier, amount_hkd, payment_type, paid_at, merchant_id, stripe_subscription_id, stripe_invoice_id, merchants(name)'
      )
      .eq('status', 'completed')
      .gte('paid_at', monthStart)
      .lt('paid_at', monthEnd)
      .order('paid_at', { ascending: false })
      .limit(50),
    supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'premium'),
    supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'vip'),
    supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'basic'),
    supabase
      .from('merchant_tier_upgrades')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('merchants')
      .select('id, name, slug, tier, tier_period_end, stripe_subscription_id')
      .in('tier', ['premium', 'vip'])
      .order('tier_period_end', { ascending: true, nullsFirst: false }),
  ]);

  const monthPayments = (payments || []) as Array<{
    id: string;
    tier: PaidTier;
    amount_hkd: number;
    payment_type: string;
    paid_at: string;
    stripe_subscription_id: string | null;
    stripe_invoice_id: string | null;
    merchants: { name: string } | null;
  }>;

  const { data: allForTotal } = await supabase
    .from('merchant_subscription_payments')
    .select('amount_hkd, paid_at')
    .eq('status', 'completed');

  const rows = (allForTotal || []) as { amount_hkd: number; paid_at: string }[];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.amount_hkd), 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.amount_hkd), 0);

  let monthInitialRevenue = 0;
  let monthRenewalRevenue = 0;
  let monthInitialCount = 0;
  let monthRenewalCount = 0;
  for (const p of monthPayments) {
    const amount = Number(p.amount_hkd);
    if (p.payment_type === 'renewal') {
      monthRenewalRevenue += amount;
      monthRenewalCount += 1;
    } else {
      monthInitialRevenue += amount;
      monthInitialCount += 1;
    }
  }

  const expiringSoon: SubscriptionExpiryRow[] = [];
  const expired: SubscriptionExpiryRow[] = [];
  for (const m of (paidMerchants || []) as Array<{
    id: string;
    name: string;
    slug: string;
    tier: PaidTier;
    tier_period_end: string | null;
    stripe_subscription_id: string | null;
  }>) {
    const periodEnd = m.tier_period_end;
    const days = daysUntil(periodEnd, now);
    const row: SubscriptionExpiryRow = {
      id: m.id,
      name: m.name,
      slug: m.slug,
      tier: m.tier,
      periodEnd,
      channel: detectSubscriptionPaymentChannel(m.stripe_subscription_id, null),
      daysRemaining: days,
    };

    if (days == null) continue;
    if (days < 0) {
      expired.push(row);
    } else if (new Date(periodEnd!).getTime() <= soonEnd.getTime()) {
      expiringSoon.push(row);
    }
  }

  return {
    totalRevenue,
    monthRevenue,
    monthInitialRevenue,
    monthRenewalRevenue,
    monthInitialCount,
    monthRenewalCount,
    activePremium: premiumCount || 0,
    activeVip: vipCount || 0,
    tierDistribution: {
      basic: basicCount || 0,
      premium: premiumCount || 0,
      vip: vipCount || 0,
    },
    pendingUpgradeCount: pendingUpgradeCount || 0,
    expiringSoon,
    expired,
    recentPayments: monthPayments.map((p) => ({
      id: p.id,
      merchant_name: p.merchants?.name || '未知商家',
      tier: p.tier,
      amount_hkd: Number(p.amount_hkd),
      payment_type: p.payment_type,
      paid_at: p.paid_at,
      channel: detectSubscriptionPaymentChannel(p.stripe_subscription_id, p.stripe_invoice_id),
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
