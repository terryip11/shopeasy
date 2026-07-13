import { describe, expect, it } from 'vitest';
import {
  HK_DISTRICT_COORDS,
  isLegacyDropoffFallback,
  resolveDistrictCoordinates,
} from '@/lib/delivery/coords';

describe('resolveDistrictCoordinates', () => {
  it('maps yuen-long to Tin Shui Wai area (not Kowloon)', () => {
    const point = resolveDistrictCoordinates('yuen-long');
    expect(point).not.toBeNull();
    expect(point!.label).toBe('元朗');
    expect(point!.lat).toBeGreaterThan(22.44);
    expect(point!.lng).toBeLessThan(114.05);
    expect(isLegacyDropoffFallback(point!.lat, point!.lng)).toBe(false);
  });

  it('detects legacy Kowloon default', () => {
    const kowloon = HK_DISTRICT_COORDS['yau-tsim-mong'];
    expect(isLegacyDropoffFallback(22.3193, 114.1694)).toBe(true);
    expect(isLegacyDropoffFallback(kowloon.lat, kowloon.lng)).toBe(false);
  });
});
