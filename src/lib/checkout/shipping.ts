import { z } from 'zod';
import { MERCHANT_PAYMENT_METHODS } from '@/lib/merchant/payment-methods';

export const shippingSchema = z.object({
  name: z.string().min(1, '請輸入收件人姓名'),
  phone: z.string().min(8, '請輸入有效聯絡電話'),
  address: z.string().min(5, '請輸入完整收貨地址'),
  /** 買家結帳不必填；配送區域由商家建立配送任務時指定 */
  zone_id: z
    .union([z.string().uuid(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const cartItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().positive(),
  image: z.string().optional(),
  quantity: z.number().int().positive(),
  variant_id: z.string().uuid().optional(),
  variant_label: z.string().optional(),
  option_selections: z
    .array(
      z.object({
        group_id: z.string().uuid(),
        option_ids: z.array(z.string().uuid()),
        labels: z.array(z.string()),
        price_delta: z.number(),
      })
    )
    .optional(),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, '購物車是空的'),
  shipping: shippingSchema,
  payment_method: z.enum(MERCHANT_PAYMENT_METHODS).default('card'),
  save_to_address_book: z.boolean().optional(),
  address_label: z.string().max(40).optional().nullable(),
  affiliate_ref: z.string().max(32).optional().nullable(),
});

export type ShippingInfo = z.infer<typeof shippingSchema>;
export type CheckoutItem = z.infer<typeof cartItemSchema>;
