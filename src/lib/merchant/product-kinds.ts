import type { MerchantBusinessType } from '@/lib/merchant/business-type';

export const PRODUCT_KINDS = ['general', 'menu_item', 'apparel', 'footwear'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  general: '一般商品',
  menu_item: '餐飲／餐點',
  apparel: '服飾',
  footwear: '鞋類',
};

export const FOOD_PRODUCT_KINDS: ProductKind[] = ['menu_item'];
export const RETAIL_PRODUCT_KINDS: ProductKind[] = ['general', 'apparel', 'footwear'];

export function defaultProductKind(businessType: MerchantBusinessType): ProductKind {
  return businessType === 'food' ? 'menu_item' : 'general';
}

export function productKindsForBusiness(businessType: MerchantBusinessType): ProductKind[] {
  return businessType === 'food' ? FOOD_PRODUCT_KINDS : RETAIL_PRODUCT_KINDS;
}

export type FoodAttributes = {
  spicy_level?: 'none' | 'mild' | 'medium' | 'hot';
  is_vegetarian?: boolean;
  serving_note?: string;
};

export type RetailAttributes = {
  material?: string;
  fit?: string;
  size_chart_url?: string;
};

export const SPICY_LEVEL_LABELS: Record<NonNullable<FoodAttributes['spicy_level']>, string> = {
  none: '不辣',
  mild: '小辣',
  medium: '中辣',
  hot: '大辣',
};
