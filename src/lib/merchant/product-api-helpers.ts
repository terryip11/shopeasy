import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { productCreateSchema } from '@/lib/merchant/products';
import {
  loadProductOptionGroups,
  loadProductVariants,
  syncProductOptionGroups,
  syncProductVariants,
} from '@/lib/merchant/product-persist';
import { productHasVariants } from '@/lib/merchant/product-form-types';
import { defaultProductKind } from '@/lib/merchant/product-kinds';
import { normalizeBusinessType } from '@/lib/merchant/business-type';

function productColumnHint(msg: string): string | null {
  if (msg.includes('checkout_shipping_fee') || msg.includes('courier_fee')) {
    return '資料庫尚未加入商品運費欄位，請執行 supabase/migrate-v29-product-shipping-fees.sql';
  }
  if (msg.includes('product_kind') || msg.includes('attributes') || msg.includes('menu_category')) {
    return '資料庫尚未加入商品行業欄位，請執行 supabase/migrate-v36-product-kind-attributes.sql';
  }
  if (msg.includes('product_variants')) {
    return '資料庫尚未建立規格表，請執行 supabase/migrate-v37-product-variants.sql';
  }
  if (msg.includes('product_option_groups') || msg.includes('product_options')) {
    return '資料庫尚未建立餐飲選項表，請執行 supabase/migrate-v38-product-option-groups.sql';
  }
  return null;
}

export async function buildProductInsertPayload(
  parsed: ReturnType<typeof productCreateSchema.parse>,
  merchant: { id: string; business_type?: string | null }
) {
  const businessType = normalizeBusinessType(merchant.business_type);
  const productKind = parsed.product_kind ?? defaultProductKind(businessType);
  const hasVariants = productHasVariants(parsed.variants);

  return {
    row: {
      name: parsed.name,
      description: parsed.description ?? null,
      price: parsed.price,
      stock: hasVariants ? 0 : parsed.stock,
      category_id: parsed.category_id || null,
      images: parsed.images,
      status: parsed.status,
      checkout_shipping_fee: parsed.checkout_shipping_fee,
      courier_fee: parsed.courier_fee ?? null,
      product_kind: productKind,
      menu_category_id: parsed.menu_category_id ?? null,
      attributes: parsed.attributes ?? {},
    },
    variants: parsed.variants,
    optionGroups: parsed.option_groups,
    hasVariants,
  };
}

export async function persistProductExtras(
  productId: string,
  extras: {
    variants?: ReturnType<typeof productCreateSchema.parse>['variants'];
    optionGroups?: ReturnType<typeof productCreateSchema.parse>['option_groups'];
    hasVariants: boolean;
    syncVariants?: boolean;
    syncOptionGroups?: boolean;
  }
) {
  const admin = createAdminClient();

  if (extras.syncVariants) {
    if (extras.hasVariants && extras.variants?.length) {
      await syncProductVariants(productId, extras.variants);
    } else {
      await admin.from('product_variants').delete().eq('product_id', productId);
    }
  }

  if (extras.syncOptionGroups) {
    if (extras.optionGroups?.length) {
      await syncProductOptionGroups(productId, extras.optionGroups);
    } else {
      await admin.from('product_option_groups').delete().eq('product_id', productId);
    }
  }
}

export async function loadProductFormExtras(productId: string) {
  const [variants, option_groups] = await Promise.all([
    loadProductVariants(productId),
    loadProductOptionGroups(productId),
  ]);
  return { variants, option_groups };
}

export { productColumnHint };
