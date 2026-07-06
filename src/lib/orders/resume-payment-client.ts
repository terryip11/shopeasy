import {
  PAYMENT_METHOD_META,
  MERCHANT_PAYMENT_METHODS,
  type MerchantPaymentMethod,
} from '@/lib/merchant/payment-methods';

export function resolveOrderPaymentMethod(order: {
  payment_method?: string | null;
  stripe_payment_id?: string | null;
}): MerchantPaymentMethod {
  const raw = order.payment_method;
  if (raw && MERCHANT_PAYMENT_METHODS.includes(raw as MerchantPaymentMethod)) {
    return raw as MerchantPaymentMethod;
  }
  return 'card';
}

export function getResumePaymentLabel(method: MerchantPaymentMethod): string {
  if (method === 'card') return '立即付款';
  return `查看${PAYMENT_METHOD_META[method].label}收款資訊`;
}
