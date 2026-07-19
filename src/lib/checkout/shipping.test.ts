import { describe, it, expect } from 'vitest';
import { shippingSchema } from '@/lib/checkout/shipping';

const validShipping = {
  name: '王小明',
  phone: '91234567',
  address: '香港九龍旺角彌敦道 100 號',
};

describe('shippingSchema', () => {
  it('accepts shipping without zone_id', () => {
    const result = shippingSchema.safeParse(validShipping);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone_id).toBeNull();
    }
  });

  it('accepts empty zone_id as null', () => {
    const result = shippingSchema.safeParse({ ...validShipping, zone_id: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone_id).toBeNull();
    }
  });

  it('accepts valid zone_id uuid', () => {
    const result = shippingSchema.safeParse({
      ...validShipping,
      zone_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zone_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
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
