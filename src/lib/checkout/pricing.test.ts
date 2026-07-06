import { describe, expect, it } from 'vitest';
import { computeLineUnitPrice } from '@/lib/checkout/pricing';

describe('computeLineUnitPrice', () => {
  const basePrice = 100;

  it('uses base price when no variants or options', () => {
    const result = computeLineUnitPrice({ basePrice, variants: [], optionGroups: [] });
    expect(result.price).toBe(100);
    expect(result.error).toBeUndefined();
  });

  it('uses variant price when set', () => {
    const result = computeLineUnitPrice({
      basePrice,
      variants: [
        {
          id: 'v1',
          product_id: 'p1',
          size: 'M',
          color: '黑',
          price: 120,
        },
      ],
      variantId: 'v1',
      optionGroups: [],
    });
    expect(result.price).toBe(120);
    expect(result.variantLabel).toBe('M / 黑');
  });

  it('adds option price deltas', () => {
    const result = computeLineUnitPrice({
      basePrice,
      variants: [],
      optionGroups: [
        {
          id: 'g1',
          product_id: 'p1',
          name: '加料',
          min_select: 0,
          max_select: 2,
          required: false,
          options: [
            { id: 'o1', group_id: 'g1', name: '芝士', price_delta: 5 },
            { id: 'o2', group_id: 'g1', name: '蛋', price_delta: 3 },
          ],
        },
      ],
      optionSelections: [{ group_id: 'g1', option_ids: ['o1', 'o2'] }],
    });
    expect(result.price).toBe(108);
  });

  it('requires mandatory option groups', () => {
    const result = computeLineUnitPrice({
      basePrice,
      variants: [],
      optionGroups: [
        {
          id: 'g1',
          product_id: 'p1',
          name: '辣度',
          min_select: 1,
          max_select: 1,
          required: true,
          options: [{ id: 'o1', group_id: 'g1', name: '小辣', price_delta: 0 }],
        },
      ],
    });
    expect(result.error).toContain('辣度');
  });
});
