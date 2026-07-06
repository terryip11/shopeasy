import { describe, it, expect } from 'vitest';
import { mapClaimError } from '@/lib/courier/types';

describe('mapClaimError', () => {
  it('maps known error codes to Chinese messages', () => {
    expect(mapClaimError('JOB_ALREADY_CLAIMED')).toBe('此單已被其他配送員接走');
    expect(mapClaimError('UNAUTHORIZED')).toBe('請先登入');
  });

  it('returns original message for unknown codes', () => {
    expect(mapClaimError('SOME_OTHER_ERROR')).toBe('SOME_OTHER_ERROR');
  });
});
