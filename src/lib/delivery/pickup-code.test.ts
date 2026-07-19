import { describe, expect, it } from 'vitest';
import {
  buildPickupQrPayload,
  normalizePickupCode,
  parsePickupQrPayload,
} from '@/lib/delivery/pickup-code';

describe('pickup-code', () => {
  it('builds and parses QR payload', () => {
    const payload = buildPickupQrPayload('job-1', 'ab12cd34');
    expect(payload).toBe('SEPK|job-1|AB12CD34');
    expect(parsePickupQrPayload(payload)).toEqual({ jobId: 'job-1', code: 'AB12CD34' });
  });

  it('accepts bare code', () => {
    expect(parsePickupQrPayload('xy9k2m7p')).toEqual({ jobId: '', code: 'XY9K2M7P' });
  });

  it('normalizes codes', () => {
    expect(normalizePickupCode(' ab-12 ')).toBe('AB12');
  });
});
