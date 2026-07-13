import { describe, expect, it } from 'vitest';
import { validatePromoterFpsPayout } from '@/lib/promoter/payout';

describe('validatePromoterFpsPayout', () => {
  it('requires holder and fps id', () => {
    expect(validatePromoterFpsPayout({ accountHolder: '', fpsId: '' })).toContain('收款人');
    expect(
      validatePromoterFpsPayout({ accountHolder: '陳大文', fpsId: '' })
    ).toContain('FPS');
  });

  it('accepts valid fps payout', () => {
    expect(
      validatePromoterFpsPayout({ accountHolder: '陳大文', fpsId: '91234567' })
    ).toBeNull();
  });
});
