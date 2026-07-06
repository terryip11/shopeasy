export const MERCHANT_PAYMENT_METHODS = [
  'card',
  'bank_transfer',
  'fps',
  'wechat_pay',
  'alipay',
] as const;

export type MerchantPaymentMethod = (typeof MERCHANT_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_META: Record<
  MerchantPaymentMethod,
  { label: string; description: string; required?: boolean }
> = {
  card: {
    label: '信用卡',
    description: '客人以 Visa、MasterCard、JCB 線上付款（Stripe）',
    required: true,
  },
  bank_transfer: {
    label: '銀行轉帳',
    description: '客人轉帳至您的銀行戶口（須填寫收款資料）',
  },
  fps: {
    label: '轉數快 FPS',
    description: '客人以 FPS 轉帳（須填寫 FPS 識別碼）',
  },
  wechat_pay: {
    label: '微信支付',
    description: '客人掃描您的微信收款碼付款（建議上傳二維碼）',
  },
  alipay: {
    label: '支付寶',
    description: '客人掃描您的支付寶收款碼付款（建議上傳二維碼）',
  },
};

export function normalizePaymentMethods(
  methods: string[] | null | undefined
): MerchantPaymentMethod[] {
  const allowed = new Set(MERCHANT_PAYMENT_METHODS);
  const picked = (methods ?? []).filter((m): m is MerchantPaymentMethod =>
    allowed.has(m as MerchantPaymentMethod)
  );
  if (!picked.includes('card')) picked.unshift('card');
  return [...new Set(picked)];
}
