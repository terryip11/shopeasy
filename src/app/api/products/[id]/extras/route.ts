import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/** 公開：商品規格與餐飲選項（供商品詳情頁） */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('id, price, stock, product_kind')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: '商品不存在' }, { status: 404 });
  }

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku, size, color, price, stock')
    .eq('product_id', id)
    .order('sort_order');

  const { data: groups } = await supabase
    .from('product_option_groups')
    .select('id, name, min_select, max_select, required, sort_order')
    .eq('product_id', id)
    .order('sort_order');

  const optionGroups = [];
  for (const g of (groups || []) as Array<Record<string, unknown>>) {
    const { data: options } = await supabase
      .from('product_options')
      .select('id, name, price_delta, sort_order')
      .eq('group_id', g.id as string)
      .order('sort_order');
    optionGroups.push({ ...g, options: options || [] });
  }

  return NextResponse.json({
    basePrice: Number((product as { price: number }).price),
    stock: Number((product as { stock: number }).stock ?? 0),
    variants: variants || [],
    optionGroups,
  });
}
