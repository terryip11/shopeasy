import { describe, it, expect } from 'vitest';
import { getUpgradeOptions, isHigherTier, checkImageCount } from '@/lib/merchant/tier-config';

describe('merchant tier config', () => {
  it('returns upgrade options for basic tier', () => {
    expect(getUpgradeOptions('basic')).toEqual(['premium', 'vip']);
  });

  it('validates tier ordering', () => {
    expect(isHigherTier('premium', 'basic')).toBe(true);
    expect(isHigherTier('basic', 'premium')).toBe(false);
  });

  it('enforces image limits', () => {
    expect(checkImageCount('basic', 2).ok).toBe(true);
    expect(checkImageCount('basic', 3).ok).toBe(false);
    expect(
      checkImageCount('basic', 3, {
        basic: { maxProducts: 3, maxImagesPerProduct: 4 },
        premium: { maxProducts: 20, maxImagesPerProduct: 5 },
        vip: { maxProducts: 50, maxImagesPerProduct: 8 },
      }).ok
    ).toBe(true);
  });
});
