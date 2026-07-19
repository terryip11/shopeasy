import { z } from 'zod';
import { PRODUCT_KINDS } from '@/lib/merchant/product-kinds';
import { optionGroupDraftSchema, productExtrasSchema, variantDraftSchema } from '@/lib/merchant/product-form-types';

export const productSchema = z.object({
  name: z.string().min(1, '請輸入商品名稱').max(200),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().positive('價格必須大於 0'),
  category_id: z.string().uuid().optional().nullable(),
  images: z.array(z.string()).default([]),
  stock: z.coerce.number().int().min(0, '庫存不可為負數').default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  checkout_shipping_fee: z.coerce.number().min(0, '運費不可為負數').max(99999).default(0),
  courier_fee: z.number().min(0, '配送費不可為負數').max(99999).nullable().optional(),
  pickup_location_id: z.string().uuid().nullable().optional(),
  product_kind: z.enum(PRODUCT_KINDS).optional(),
  menu_category_id: z.string().uuid().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  variants: z.array(variantDraftSchema).optional(),
  option_groups: z.array(optionGroupDraftSchema).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const productCreateSchema = productSchema.superRefine((data, ctx) => {
  const hasVariants = (data.variants?.length ?? 0) > 0;
  if (hasVariants) {
    if (data.variants!.some((v) => !v.size?.trim() && !v.color?.trim())) {
      ctx.addIssue({
        code: 'custom',
        message: '每個規格至少填寫呎碼或顏色',
        path: ['variants'],
      });
    }
  }
});

export { productExtrasSchema, variantDraftSchema, optionGroupDraftSchema };

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
});

export type CheckoutItem = z.infer<typeof cartItemSchema>;
