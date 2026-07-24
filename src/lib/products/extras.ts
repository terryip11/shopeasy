import 'server-only';

import { createClient } from '@/lib/supabase/server';

export type ProductExtraVariant = {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
};

export type ProductExtraOption = {
  id: string;
  name: string;
  price_delta: number;
  sort_order?: number;
};

export type ProductExtraOptionGroup = {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  sort_order?: number;
  options: ProductExtraOption[];
};

export type ProductExtras = {
  basePrice: number;
  stock: number;
  variants: ProductExtraVariant[];
  optionGroups: ProductExtraOptionGroup[];
};

/** 公開商品規格／選項（單次 batch，無 N+1） */
export async function getProductExtras(productId: string): Promise<ProductExtras | null> {
  const supabase = await createClient();

  const [{ data: product }, { data: variants }, { data: groups }] = await Promise.all([
    supabase
      .from('products')
      .select('id, price, stock, product_kind')
      .eq('id', productId)
      .eq('status', 'published')
      .maybeSingle(),
    supabase
      .from('product_variants')
      .select('id, sku, size, color, price, stock')
      .eq('product_id', productId)
      .order('sort_order'),
    supabase
      .from('product_option_groups')
      .select('id, name, min_select, max_select, required, sort_order')
      .eq('product_id', productId)
      .order('sort_order'),
  ]);

  if (!product) return null;

  const groupList = (groups || []) as Array<{
    id: string;
    name: string;
    min_select: number;
    max_select: number;
    required: boolean;
    sort_order?: number;
  }>;

  const optionsByGroup = new Map<string, ProductExtraOption[]>();
  if (groupList.length > 0) {
    const { data: options } = await supabase
      .from('product_options')
      .select('id, group_id, name, price_delta, sort_order')
      .in(
        'group_id',
        groupList.map((g) => g.id)
      )
      .order('sort_order');

    for (const opt of (options || []) as Array<{
      id: string;
      group_id: string;
      name: string;
      price_delta: number;
      sort_order?: number;
    }>) {
      const list = optionsByGroup.get(opt.group_id) ?? [];
      list.push({
        id: opt.id,
        name: opt.name,
        price_delta: Number(opt.price_delta ?? 0),
        sort_order: opt.sort_order,
      });
      optionsByGroup.set(opt.group_id, list);
    }
  }

  return {
    basePrice: Number((product as { price: number }).price),
    stock: Number((product as { stock: number | null }).stock ?? 0),
    variants: ((variants || []) as ProductExtraVariant[]).map((v) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
      stock: Number(v.stock ?? 0),
    })),
    optionGroups: groupList.map((g) => ({
      id: g.id,
      name: g.name,
      min_select: Number(g.min_select ?? 0),
      max_select: Number(g.max_select ?? 1),
      required: Boolean(g.required),
      sort_order: g.sort_order,
      options: optionsByGroup.get(g.id) ?? [],
    })),
  };
}
