import type { DeliveryJobType } from '@/lib/auth/capabilities';

import type { MerchantTier } from '@/types/database';



/** Stripe 香港卡款估算（實際以 Balance Transaction 為準） */

export const STRIPE_FEE_PERCENT = 0.029;

export const STRIPE_FEE_FIXED_HKD = 2.35;



/** 依商家訂閱等級的平台服務費率（以 GMV 計） */

export const PLATFORM_FEE_RATE_BY_TIER: Record<MerchantTier, number> = {

  basic: 0.02,

  premium: 0.015,

  vip: 0.01,

};



export const DEFAULT_PLATFORM_FEE_RATE = PLATFORM_FEE_RATE_BY_TIER.basic;



/** 商家未設定時的預設配送員工資 */

export const DEFAULT_COURIER_FEE_BY_JOB_TYPE: Record<DeliveryJobType, number> = {

  food: 25,

  parcel: 35,

};



/** 每月配送員薪資結算日（當月第 N 日結算上月） */

export const COURIER_PAYROLL_DAY = 5;



export function getPlatformFeeRate(tier?: string | null): number {

  if (tier && tier in PLATFORM_FEE_RATE_BY_TIER) {

    return PLATFORM_FEE_RATE_BY_TIER[tier as MerchantTier];

  }

  return DEFAULT_PLATFORM_FEE_RATE;

}



export function roundMoney(n: number): number {

  return Math.round(n * 100) / 100;

}



/** 結算目標月份（上月）的 period_start，如 2026-05-01 */

export function previousMonthPeriodStart(reference = new Date()): string {

  const y = reference.getFullYear();

  const m = reference.getMonth();

  const d = new Date(y, m - 1, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

}



export function periodEndFromStart(periodStart: string): string {

  const [y, m] = periodStart.split('-').map(Number);

  const last = new Date(y, m, 0);

  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;

}

