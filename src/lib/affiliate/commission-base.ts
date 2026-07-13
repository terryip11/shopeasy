import { roundMoney, STRIPE_FEE_FIXED_HKD, STRIPE_FEE_PERCENT } from '@/lib/finance/config';
import { parseOrderItems } from '@/lib/orders/types';

function estimateStripeFeeHkd(gmv: number): number {
  if (gmv <= 0) return 0;
  return roundMoney(gmv * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_HKD);
}

export type AffiliateCommissionSnapshot = {  commissionBase: number;
  commissionRate: number;
  commissionGross: number;
  platformFee: number;
  promoterNet: number;
};

export function computeAffiliateCommission(
  commissionBase: number,
  commissionRate: number,
  platformCutRate: number
): AffiliateCommissionSnapshot {
  const base = roundMoney(commissionBase);
  const commissionGross = roundMoney(base * commissionRate);
  const platformFee = roundMoney(commissionGross * platformCutRate);
  const promoterNet = roundMoney(commissionGross - platformFee);

  return {
    commissionBase: base,
    commissionRate,
    commissionGross,
    platformFee,
    promoterNet,
  };
}

/** 只加總被分享商品在訂單內的金額（price × quantity） */
export function sumSharedProductSubtotal(
  items: unknown,
  sharedProductId: string
): number {
  const parsed = parseOrderItems(items);
  const total = parsed
    .filter((item) => item.product_id === sharedProductId)
    .reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  return roundMoney(total);
}

export type MerchantAffiliateEstimateInput = {
  sharedSubtotal: number;
  otherSubtotal: number;
  shippingFee: number;
  commissionRate: number;
  platformFeeRate: number;
  platformCutOnCommission: number;
  includeStripe: boolean;
};

export type MerchantAffiliateEstimate = {
  gmv: number;
  commissionBase: number;
  commissionGross: number;
  promoterNet: number;
  platformCutOnCommission: number;
  platformServiceFee: number;
  stripeFee: number;
  merchantNet: number;
};

/** 商家分享訂單費用試算（不含基礎設施分攤） */
export function estimateMerchantAffiliatePayout(
  input: MerchantAffiliateEstimateInput
): MerchantAffiliateEstimate {
  const sharedSubtotal = roundMoney(Math.max(0, input.sharedSubtotal));
  const otherSubtotal = roundMoney(Math.max(0, input.otherSubtotal));
  const shippingFee = roundMoney(Math.max(0, input.shippingFee));
  const subtotal = roundMoney(sharedSubtotal + otherSubtotal);
  const gmv = roundMoney(subtotal + shippingFee);

  const commission = computeAffiliateCommission(
    sharedSubtotal,
    input.commissionRate,
    input.platformCutOnCommission
  );

  const platformServiceFee = roundMoney(gmv * input.platformFeeRate);
  const stripeFee = input.includeStripe ? estimateStripeFeeHkd(gmv) : 0;
  const merchantNet = roundMoney(
    gmv - stripeFee - platformServiceFee - commission.commissionGross
  );

  return {
    gmv,
    commissionBase: commission.commissionBase,
    commissionGross: commission.commissionGross,
    promoterNet: commission.promoterNet,
    platformCutOnCommission: commission.platformFee,
    platformServiceFee,
    stripeFee,
    merchantNet,
  };
}
