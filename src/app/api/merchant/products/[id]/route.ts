import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { productSchema, productCreateSchema } from '@/lib/merchant/products';
import { requireRole, getActiveMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { checkImageCount, type MerchantTier } from '@/lib/merchant/tiers';
import {
  buildProductInsertPayload,
  loadProductFormExtras,
  persistProductExtras,
  productColumnHint,
} from '@/lib/merchant/product-api-helpers';
import { productHasVariants } from '@/lib/merchant/product-form-types';
import type { Database } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };
type ProductRow = Database['public']['Tables']['products']['Row'];
type MerchantContext = NonNullable<Awaited<ReturnType<typeof getActiveMerchantForUser>>>;

type OwnProductResult =
  | { error: NextResponse; product: null; merchant: null }
  | { error: null; product: ProductRow; merchant: MerchantContext };

async function assertMerchantOwnsProduct(productId: string): Promise<OwnProductResult> {
  const auth = await requireRole(['merchant', 'admin', 'super_admin']);
  if (!auth.authorized) {
    return {
      error: NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 }),
      product: null,
      merchant: null,
    };
  }

  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return {
      error: NextResponse.json({ error: '請先建立店鋪' }, { status: 400 }),
      product: null,
      merchant: null,
    };
  }

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('merchant_id', merchant.id)
    .single();

  if (error || !product) {
    return {
      error: NextResponse.json({ error: '商品不存在' }, { status: 404 }),
      product: null,
      merchant: null,
    };
  }

  return { error: null, product: product as ProductRow, merchant };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await assertMerchantOwnsProduct(id);
  if (result.error) return result.error;

  try {
    const extras = await loadProductFormExtras(id);
    return NextResponse.json({ ...result.product, ...extras });
  } catch {
    return NextResponse.json(result.product);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await assertMerchantOwnsProduct(id);
  if (result.error) return result.error;

  try {
    const body = await request.json();
    const parsed = productSchema.partial().parse(body);

    if (parsed.images !== undefined) {
      const tier = ((result.merchant!.tier as MerchantTier) || 'basic');
      const imageLimit = checkImageCount(tier, parsed.images.length);
      if (!imageLimit.ok) {
        return NextResponse.json({ error: imageLimit.error }, { status: 403 });
      }
    }

    const patchRow: Record<string, unknown> = {};
    if (parsed.name !== undefined) patchRow.name = parsed.name;
    if (parsed.description !== undefined) patchRow.description = parsed.description;
    if (parsed.price !== undefined) patchRow.price = parsed.price;
    if (parsed.stock !== undefined && !productHasVariants(parsed.variants ?? undefined)) {
      patchRow.stock = parsed.stock;
    }
    if (parsed.category_id !== undefined) patchRow.category_id = parsed.category_id || null;
    if (parsed.images !== undefined) patchRow.images = parsed.images;
    if (parsed.status !== undefined) patchRow.status = parsed.status;
    if (parsed.checkout_shipping_fee !== undefined) {
      patchRow.checkout_shipping_fee = parsed.checkout_shipping_fee;
    }
    if (parsed.courier_fee !== undefined) patchRow.courier_fee = parsed.courier_fee;
    if (parsed.product_kind !== undefined) patchRow.product_kind = parsed.product_kind;
    if (parsed.menu_category_id !== undefined) {
      patchRow.menu_category_id = parsed.menu_category_id;
    }
    if (parsed.attributes !== undefined) patchRow.attributes = parsed.attributes;

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('products')
      .update(patchRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const hint = productColumnHint(error.message || '');
      if (hint) return NextResponse.json({ error: hint }, { status: 500 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.variants !== undefined || parsed.option_groups !== undefined) {
      const { product } = result;
      const merged = productCreateSchema.parse({
        name: product.name,
        description: product.description,
        price: Number(product.price),
        category_id: product.category_id,
        images: product.images || [],
        stock: Number(product.stock ?? 0),
        status: product.status,
        checkout_shipping_fee: Number(product.checkout_shipping_fee ?? 0),
        courier_fee: product.courier_fee != null ? Number(product.courier_fee) : null,
        product_kind: product.product_kind,
        menu_category_id: product.menu_category_id,
        attributes: product.attributes as Record<string, unknown>,
        ...parsed,
        variants: parsed.variants ?? [],
        option_groups: parsed.option_groups ?? [],
      });
      const built = await buildProductInsertPayload(merged, result.merchant!);
      await persistProductExtras(id, {
        variants: built.variants,
        optionGroups: built.optionGroups,
        hasVariants: built.hasVariants,
        syncVariants: parsed.variants !== undefined,
        syncOptionGroups: parsed.option_groups !== undefined,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    const hint = productColumnHint((err as Error).message || '');
    if (hint) return NextResponse.json({ error: hint }, { status: 500 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await assertMerchantOwnsProduct(id);
  if (result.error) return result.error;

  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
