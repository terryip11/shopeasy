import { describe, expect, it } from 'vitest';
import {
  estimateMerchantAffiliatePayout,
  sumSharedProductSubtotal,
} from '@/lib/affiliate/commission-base';

describe('sumSharedProductSubtotal', () => {
  it('只加總被分享商品行', () => {
    const items = [
      { product_id: 'a', name: 'A', price: 50, quantity: 1 },
      { product_id: 'b', name: 'B', price: 30, quantity: 2 },
    ];
    expect(sumSharedProductSubtotal(items, 'a')).toBe(50);
    expect(sumSharedProductSubtotal(items, 'b')).toBe(60);
  });

  it('無匹配商品時為 0', () => {
    expect(sumSharedProductSubtotal([], 'x')).toBe(0);
  });
});

describe('estimateMerchantAffiliatePayout', () => {
  it('佣金只算被分享商品，平台費按 GMV', () => {
    const result = estimateMerchantAffiliatePayout({
      sharedSubtotal: 50,
      otherSubtotal: 50,
      shippingFee: 20,
      commissionRate: 0.1,
      platformFeeRate: 0.02,
      platformCutOnCommission: 0.2,
      includeStripe: false,
    });

    expect(result.gmv).toBe(120);
    expect(result.commissionBase).toBe(50);
    expect(result.commissionGross).toBe(5);
    expect(result.platformServiceFee).toBe(2.4);
    expect(result.merchantNet).toBe(112.6);
  });
});
