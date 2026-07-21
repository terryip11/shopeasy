import type { MerchantBusinessType } from '@/lib/merchant/business-type';
import { defaultJobTypeForBusinessType, normalizeBusinessType } from '@/lib/merchant/business-type';
import { roundMoney, DEFAULT_COURIER_FEE_BY_JOB_TYPE, getPlatformFeeRate } from '@/lib/finance/config';
import {
  STRIPE_FEE_FIXED_HKD,
  STRIPE_FEE_PERCENT,
} from '@/lib/finance/config';

export type ProductShippingContext = {
  businessType: MerchantBusinessType;
  shopCourierFeeFood: number;
  shopCourierFeeParcel: number;
  minCourierBaseFood: number;
  minCourierBaseParcel: number;
  /** 平台服務費率（依商家訂閱等級） */
  platformFeeRate: number;
};

export function shopDefaultCourierFee(ctx: ProductShippingContext): number {
  return ctx.businessType === 'food' ? ctx.shopCourierFeeFood : ctx.shopCourierFeeParcel;
}

export function platformMinCourierBase(ctx: ProductShippingContext): number {
  return ctx.businessType === 'food' ? ctx.minCourierBaseFood : ctx.minCourierBaseParcel;
}

/** 商品未覆寫時用店鋪預設，再套用平台保底 */
export function resolveProductCourierBase(
  productCourierFee: number | null | undefined,
  ctx: ProductShippingContext
): number {
  const raw = productCourierFee ?? shopDefaultCourierFee(ctx);
  const floor = platformMinCourierBase(ctx);
  if (floor <= 0) return roundMoney(raw);
  return roundMoney(Math.max(raw, floor));
}

export function estimateSingleItemOrderNet(input: {
  price: number;
  shippingFee: number;
  courierBase: number;
  platformFeeRate: number;
  /** 預設 false：線下付款為主，不含 Stripe 卡費 */
  includeStripe?: boolean;
}) {
  const gmv = roundMoney(input.price + input.shippingFee);
  const stripeFee =
    input.includeStripe === true
      ? roundMoney(gmv * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_HKD)
      : 0;
  const platformFee = roundMoney(gmv * input.platformFeeRate);
  const afterFees = roundMoney(gmv - stripeFee - platformFee);
  const netAfterDelivery = roundMoney(afterFees - input.courierBase);
  return { gmv, stripeFee, platformFee, afterFees, netAfterDelivery };
}

export function deliveryJobTypeLabel(businessType: MerchantBusinessType): string {
  return defaultJobTypeForBusinessType(businessType) === 'food' ? '外賣送餐' : '貨物配送';
}

export function buildProductShippingContext(
  merchant: {
    business_type?: string | null;
    courier_fee_food?: number | null;
    courier_fee_parcel?: number | null;
    tier?: string | null;
  } | null,
  minFees: { food: number; parcel: number },
  /** 訂閱為主模式下應傳 0 */
  platformFeeRateOverride?: number
): ProductShippingContext {
  return {
    businessType: normalizeBusinessType(merchant?.business_type),
    shopCourierFeeFood: Number(
      merchant?.courier_fee_food ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.food
    ),
    shopCourierFeeParcel: Number(
      merchant?.courier_fee_parcel ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.parcel
    ),
    minCourierBaseFood: minFees.food,
    minCourierBaseParcel: minFees.parcel,
    platformFeeRate:
      platformFeeRateOverride !== undefined
        ? platformFeeRateOverride
        : getPlatformFeeRate(merchant?.tier),
  };
}
