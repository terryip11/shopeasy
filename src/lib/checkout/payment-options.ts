import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  MERCHANT_PAYMENT_METHODS,
  PAYMENT_METHOD_META,
  normalizePaymentMethods,
  type MerchantPaymentMethod,
} from '@/lib/merchant/payment-methods';
import { payoutFromMerchant, validatePayoutForMethods } from '@/lib/merchant/payout';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { computeMerchantShippingFees } from '@/lib/merchant/product-shipping';
import {
  isStripePaymentsEnabled,
  STRIPE_PAYMENTS_UNAVAILABLE_REASON,
} from '@/lib/payment/stripe';

export type CheckoutMerchantPayout = {
  merchantId: string;
  merchantName: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  payout: ReturnType<typeof payoutFromMerchant>;
};

export type CheckoutPaymentOption = {
  id: MerchantPaymentMethod;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
};

type ProductRow = {
  id: string;
  merchant_id: string;
  price: number;
  checkout_shipping_fee: number | null;
};

export function intersectPaymentMethods(merchantMethods: MerchantPaymentMethod[][]): MerchantPaymentMethod[] {
  if (merchantMethods.length === 0) return ['card'];
  let result = new Set(merchantMethods[0]);
  for (let i = 1; i < merchantMethods.length; i++) {
    const set = new Set(merchantMethods[i]);
    result = new Set([...result].filter((m) => set.has(m)));
  }
  const list = MERCHANT_PAYMENT_METHODS.filter((m) => result.has(m));
  return list.length > 0 ? list : ['card'];
}

export async function resolveCheckoutMerchants(items: { id: string; quantity: number; price: number }[]) {
  const supabase = createAdminClient();
  const productIds = items.map((i) => i.id);

  const { data: products } = await supabase
    .from('products')
    .select('id, merchant_id, price, checkout_shipping_fee')
    .in('id', productIds)
    .eq('status', 'published');

  const productMap = new Map(((products || []) as ProductRow[]).map((p) => [p.id, p]));

  const totals = new Map<string, number>();
  for (const item of items) {
    const p = productMap.get(item.id);
    if (!p) continue;
    totals.set(p.merchant_id, (totals.get(p.merchant_id) ?? 0) + item.price * item.quantity);
  }

  const shippingFees = computeMerchantShippingFees(items, (products || []) as ProductRow[]);

  const merchantIds = [...totals.keys()];
  if (merchantIds.length === 0) {
    return { merchants: [], methods: ['card'] as MerchantPaymentMethod[], enabled: ['card'] as MerchantPaymentMethod[] };
  }

  const { data: merchants } = await supabase
    .from('merchants')
    .select(
      'id, name, payment_methods, payout_bank_name, payout_account_holder, payout_account_number, payout_fps_id, payout_wechat_id, payout_wechat_qr_url, payout_alipay_id, payout_alipay_qr_url'
    )
    .in('id', merchantIds)
    .eq('status', 'active');

  const merchantRows = (merchants || []) as Array<{
    id: string;
    name: string;
    payment_methods: string[] | null;
    payout_bank_name: string | null;
    payout_account_holder: string | null;
    payout_account_number: string | null;
    payout_fps_id: string | null;
    payout_wechat_id: string | null;
    payout_wechat_qr_url: string | null;
    payout_alipay_id: string | null;
    payout_alipay_qr_url: string | null;
  }>;

  const methodsPerMerchant = merchantRows.map((m) => normalizePaymentMethods(m.payment_methods));
  const enabled = intersectPaymentMethods(methodsPerMerchant);

  const checkoutMerchants: CheckoutMerchantPayout[] = merchantRows.map((m) => {
    const subtotal = totals.get(m.id) ?? 0;
    const shippingFee = shippingFees.get(m.id) ?? 0;
    return {
      merchantId: m.id,
      merchantName: m.name,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      payout: payoutFromMerchant(m),
    };
  });

  const methods = filterReadyPaymentMethods(enabled, checkoutMerchants);

  return { merchants: checkoutMerchants, methods, enabled };
}

/** 單一商家的結帳付款選項（用於待付款訂單補付） */
export async function resolveMerchantPaymentOptions(merchantId: string) {
  const supabase = createAdminClient();

  const { data: merchant, error } = await supabase
    .from('merchants')
    .select(
      'id, name, payment_methods, payout_bank_name, payout_account_holder, payout_account_number, payout_fps_id, payout_wechat_id, payout_wechat_qr_url, payout_alipay_id, payout_alipay_qr_url'
    )
    .eq('id', merchantId)
    .eq('status', 'active')
    .single();

  if (error || !merchant) {
    return { merchants: [] as CheckoutMerchantPayout[], options: formatPaymentOptions(['card'], []) };
  }

  const row = merchant as {
    id: string;
    name: string;
    payment_methods: string[] | null;
    payout_bank_name: string | null;
    payout_account_holder: string | null;
    payout_account_number: string | null;
    payout_fps_id: string | null;
    payout_wechat_id: string | null;
    payout_wechat_qr_url: string | null;
    payout_alipay_id: string | null;
    payout_alipay_qr_url: string | null;
  };

  const enabled = normalizePaymentMethods(row.payment_methods);
  const checkoutMerchants: CheckoutMerchantPayout[] = [
    {
      merchantId: row.id,
      merchantName: row.name,
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      payout: payoutFromMerchant(row),
    },
  ];

  return {
    merchants: checkoutMerchants,
    options: formatPaymentOptions(enabled, checkoutMerchants),
  };
}

function payoutUnavailableReason(
  method: MerchantPaymentMethod,
  merchants: CheckoutMerchantPayout[]
): string | null {
  for (const m of merchants) {
    const err = validatePayoutForMethods([method], m.payout);
    if (err) return `${m.merchantName}：${err}`;
  }
  return null;
}

export function formatPaymentOptions(
  enabled: MerchantPaymentMethod[],
  merchants: CheckoutMerchantPayout[]
): CheckoutPaymentOption[] {
  return MERCHANT_PAYMENT_METHODS.map((id) => {
    const offered = enabled.includes(id);
    if (!offered) {
      return {
        id,
        label: PAYMENT_METHOD_META[id].label,
        description: PAYMENT_METHOD_META[id].description,
        available: false,
        unavailableReason: '商家未開放此付款方式',
      };
    }
    if (id === 'card' && !isStripePaymentsEnabled()) {
      return {
        id,
        label: PAYMENT_METHOD_META[id].label,
        description: PAYMENT_METHOD_META[id].description,
        available: false,
        unavailableReason: STRIPE_PAYMENTS_UNAVAILABLE_REASON,
      };
    }
    const reason = id === 'card' ? null : payoutUnavailableReason(id, merchants);
    return {
      id,
      label: PAYMENT_METHOD_META[id].label,
      description: PAYMENT_METHOD_META[id].description,
      available: reason === null,
      unavailableReason: reason ?? undefined,
    };
  });
}

export function formatPayoutForDisplay(
  method: MerchantPaymentMethod,
  payout: ReturnType<typeof payoutFromMerchant>
) {
  switch (method) {
    case 'bank_transfer':
      return {
        lines: [
          payout.bankName && `銀行：${payout.bankName}`,
          payout.accountHolder && `戶口持有人：${payout.accountHolder}`,
          payout.accountNumber && `戶口號碼：${payout.accountNumber}`,
        ].filter(Boolean) as string[],
        qrUrl: null as string | null,
      };
    case 'fps':
      return {
        lines: payout.fpsId ? [`FPS 識別碼：${payout.fpsId}`] : [],
        qrUrl: null,
      };
    case 'wechat_pay':
      return {
        lines: payout.wechatId ? [`微信帳號：${payout.wechatId}`] : [],
        qrUrl: normalizeR2ImageUrl(payout.wechatQrUrl),
      };
    case 'alipay':
      return {
        lines: payout.alipayId ? [`支付寶帳號：${payout.alipayId}`] : [],
        qrUrl: normalizeR2ImageUrl(payout.alipayQrUrl),
      };
    default:
      return { lines: [], qrUrl: null };
  }
}

export function isManualPaymentMethod(method: MerchantPaymentMethod): boolean {
  return method !== 'card';
}

/** 僅保留收款資料已齊備的線下方式（card 恆保留） */
export function filterReadyPaymentMethods(
  methods: MerchantPaymentMethod[],
  merchants: CheckoutMerchantPayout[]
): MerchantPaymentMethod[] {
  const ready = methods.filter((method) => {
    if (method === 'card') return isStripePaymentsEnabled();
    return merchants.every((m) => validatePayoutForMethods([method], m.payout) === null);
  });

  if (ready.length > 0) return ready;
  return isStripePaymentsEnabled() ? ['card'] : [];
}
