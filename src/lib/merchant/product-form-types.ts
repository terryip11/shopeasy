import { z } from 'zod';
import { PRODUCT_KINDS } from '@/lib/merchant/product-kinds';

export type MenuCategory = {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
};

export const variantDraftSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().max(64).optional().nullable(),
  size: z.string().max(32).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  price: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
});

export const optionDraftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  price_delta: z.coerce.number().min(-9999).max(9999).default(0),
});

export const optionGroupDraftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  min_select: z.coerce.number().int().min(0).default(0),
  max_select: z.coerce.number().int().min(1).default(1),
  required: z.boolean().default(false),
  options: z.array(optionDraftSchema).min(1, '每個選項群組至少一項'),
});

export const productExtrasSchema = z.object({
  product_kind: z.enum(PRODUCT_KINDS).optional(),
  menu_category_id: z.string().uuid().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  variants: z.array(variantDraftSchema).optional(),
  option_groups: z.array(optionGroupDraftSchema).optional(),
});

export type VariantDraft = z.infer<typeof variantDraftSchema>;
export type OptionDraft = z.infer<typeof optionDraftSchema>;
export type OptionGroupDraft = z.infer<typeof optionGroupDraftSchema>;
export type ProductExtras = z.infer<typeof productExtrasSchema>;

export type ProductVariantRow = VariantDraft & { id: string; product_id: string };
export type ProductOptionRow = OptionDraft & { id: string; group_id: string };
export type ProductOptionGroupRow = Omit<OptionGroupDraft, 'options'> & {
  id: string;
  product_id: string;
  options: ProductOptionRow[];
};

export function productHasVariants(variants: VariantDraft[] | undefined): boolean {
  return (variants?.length ?? 0) > 0;
}
