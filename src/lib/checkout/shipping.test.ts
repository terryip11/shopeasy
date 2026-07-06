import { describe, it, expect } from 'vitest';
import { shippingSchema } from '@/lib/checkout/shipping';

const validShipping = {
  name: '王小明',
  phone: '91234567',
  address: '香港九龍旺角彌敦道 100 號',
  zone_id: '550e8400-e29b-41d4-a716-446655440000',
};

describe('shippingSchema', () => {
  it('accepts valid shipping info', () => {
    const result = shippingSchema.safeParse(validShipping);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = shippingSchema.safeParse({ ...validShipping, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects short phone', () => {
    const result = shippingSchema.safeParse({ ...validShipping, phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid zone_id', () => {
    const result = shippingSchema.safeParse({ ...validShipping, zone_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
