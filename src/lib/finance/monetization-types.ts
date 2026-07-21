/** Client-safe monetization types（不含 server-only） */

export const MONETIZATION_MODE_KEY = 'platform_monetization_mode';
export const PAYOUT_MODEL_KEY = 'platform_payout_model';

/** 歷史列舉：產品已鎖定訂閱為主，不再提供切換 */
export const MONETIZATION_MODES = ['subscription_only', 'subscription_plus_gmv'] as const;
export type MonetizationMode = (typeof MONETIZATION_MODES)[number];

export const PAYOUT_MODELS = ['merchant_direct', 'platform_settle'] as const;
export type PayoutModel = (typeof PAYOUT_MODELS)[number];

export const DEFAULT_MONETIZATION_MODE: MonetizationMode = 'subscription_only';
export const DEFAULT_PAYOUT_MODEL: PayoutModel = 'merchant_direct';

/** 產品鎖定：訂閱為主 + 商家直付（不可切換） */
export const LOCKED_PLATFORM_MONETIZATION = {
  mode: 'subscription_only',
  payoutModel: 'merchant_direct',
} as const satisfies {
  mode: MonetizationMode;
  payoutModel: PayoutModel;
};

export type PlatformMonetizationSettings = {
  mode: MonetizationMode;
  payoutModel: PayoutModel;
};

export function isMonetizationMode(value: unknown): value is MonetizationMode {
  return typeof value === 'string' && (MONETIZATION_MODES as readonly string[]).includes(value);
}

export function isPayoutModel(value: unknown): value is PayoutModel {
  return typeof value === 'string' && (PAYOUT_MODELS as readonly string[]).includes(value);
}

export function parseMonetizationMode(raw: unknown): MonetizationMode {
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/^"|"$/g, '');
    if (isMonetizationMode(cleaned)) return cleaned;
  }
  return DEFAULT_MONETIZATION_MODE;
}

export function parsePayoutModel(raw: unknown): PayoutModel {
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/^"|"$/g, '');
    if (isPayoutModel(cleaned)) return cleaned;
  }
  return DEFAULT_PAYOUT_MODEL;
}

export const MONETIZATION_MODE_LABELS: Record<MonetizationMode, string> = {
  subscription_only: '訂閱為主（不抽訂單利潤）',
  subscription_plus_gmv: '訂閱＋按單抽成（已停用）',
};

export const PAYOUT_MODEL_LABELS: Record<PayoutModel, string> = {
  merchant_direct: '商家直付分享員／配送員',
  platform_settle: '平台代為結算（已停用）',
};
