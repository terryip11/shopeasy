import 'server-only';

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function readStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || '';
}

export function getStripe(): Stripe {
  const secretKey = readStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY 未設定。請在 .env.local 填入測試金鑰（sk_test_...）後重新啟動 npm run dev'
    );
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return readStripeSecretKey().length > 0;
}

/** 買家／商家 Stripe 線上付款暫停時的提示 */
export const STRIPE_PAYMENTS_UNAVAILABLE_REASON =
  '線上信用卡付款即將開放，請先使用轉帳、FPS 或微信／支付寶';

/** 是否開放 Stripe 線上收款（預設關閉，待公司戶口後設 STRIPE_PAYMENTS_ENABLED=true） */
export function isStripePaymentsEnabled(): boolean {
  const flag = process.env.STRIPE_PAYMENTS_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (flag === 'true' || flag === '1' || flag === 'on') {
    return isStripeConfigured();
  }
  return false;
}

export function getAppUrl() {
  const url = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  return url.replace(/\/$/, '');
}

/** Stripe line item 圖片須為公開 HTTPS URL，相對路徑會導致 "Not a valid URL" */
export function stripeProductImageUrl(image: string | undefined): string | undefined {
  if (!image?.trim()) return undefined;
  const trimmed = image.trim();
  if (trimmed.startsWith('https://')) return trimmed;
  return undefined;
}
