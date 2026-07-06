import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import { normalizePaymentMethods } from '@/lib/merchant/payment-methods';

export type MerchantPayoutDetails = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  fpsId: string;
  wechatId: string;
  wechatQrUrl: string | null;
  alipayId: string;
  alipayQrUrl: string | null;
};

export function emptyPayoutDetails(): MerchantPayoutDetails {
  return {
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    fpsId: '',
    wechatId: '',
    wechatQrUrl: null,
    alipayId: '',
    alipayQrUrl: null,
  };
}

export function payoutFromMerchant(row: {
  payout_bank_name?: string | null;
  payout_account_holder?: string | null;
  payout_account_number?: string | null;
  payout_fps_id?: string | null;
  payout_wechat_id?: string | null;
  payout_wechat_qr_url?: string | null;
  payout_alipay_id?: string | null;
  payout_alipay_qr_url?: string | null;
}): MerchantPayoutDetails {
  return {
    bankName: row.payout_bank_name?.trim() ?? '',
    accountHolder: row.payout_account_holder?.trim() ?? '',
    accountNumber: row.payout_account_number?.trim() ?? '',
    fpsId: row.payout_fps_id?.trim() ?? '',
    wechatId: row.payout_wechat_id?.trim() ?? '',
    wechatQrUrl: row.payout_wechat_qr_url ?? null,
    alipayId: row.payout_alipay_id?.trim() ?? '',
    alipayQrUrl: row.payout_alipay_qr_url ?? null,
  };
}

export function validatePayoutForMethods(
  methods: MerchantPaymentMethod[],
  payout: MerchantPayoutDetails
): string | null {
  const errors: string[] = [];

  if (methods.includes('bank_transfer')) {
    if (!payout.bankName.trim()) errors.push('銀行轉帳：請填寫收款銀行');
    else if (!payout.accountHolder.trim()) errors.push('銀行轉帳：請填寫戶口持有人');
    else if (!payout.accountNumber.trim()) errors.push('銀行轉帳：請填寫銀行戶口號碼');
  }
  if (methods.includes('fps')) {
    if (!payout.fpsId.trim()) {
      errors.push('轉數快：請填寫 FPS 識別碼（電話 / 電郵 / FPS ID）');
    }
  }
  if (methods.includes('wechat_pay')) {
    if (!payout.wechatQrUrl && !payout.wechatId.trim()) {
      errors.push('微信支付：請上傳收款碼，或填寫微信收款帳號');
    }
  }
  if (methods.includes('alipay')) {
    if (!payout.alipayQrUrl && !payout.alipayId.trim()) {
      errors.push('支付寶：請上傳收款碼，或填寫支付寶帳號');
    }
  }

  if (errors.length === 0) return null;
  return errors.join('；');
}

/** 該方式是否已有任何收款資料（用於儲存時決定要驗證哪些方式） */
export function methodHasPayoutConfig(
  method: MerchantPaymentMethod,
  payout: MerchantPayoutDetails
): boolean {
  switch (method) {
    case 'bank_transfer':
      return !!(
        payout.bankName.trim() ||
        payout.accountHolder.trim() ||
        payout.accountNumber.trim()
      );
    case 'fps':
      return !!payout.fpsId.trim();
    case 'wechat_pay':
      return !!(payout.wechatQrUrl || payout.wechatId.trim());
    case 'alipay':
      return !!(payout.alipayQrUrl || payout.alipayId.trim());
    default:
      return false;
  }
}

/** 依收款資料自動加入對應的客人付款方式 */
export function syncPaymentMethodsFromPayout(
  methods: MerchantPaymentMethod[],
  payout: MerchantPayoutDetails
): MerchantPaymentMethod[] {
  const extra: MerchantPaymentMethod[] = [];
  if (methodHasPayoutConfig('bank_transfer', payout)) extra.push('bank_transfer');
  if (methodHasPayoutConfig('fps', payout)) extra.push('fps');
  if (methodHasPayoutConfig('wechat_pay', payout)) extra.push('wechat_pay');
  if (methodHasPayoutConfig('alipay', payout)) extra.push('alipay');
  return normalizePaymentMethods([...methods, ...extra]);
}
