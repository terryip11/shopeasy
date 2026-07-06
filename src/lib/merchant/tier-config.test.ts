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
  });
});
