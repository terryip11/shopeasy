import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { OptionGroupDraft, VariantDraft } from '@/lib/merchant/product-form-types';

export async function syncProductVariants(
  productId: string,
  variants: VariantDraft[]
): Promise<number> {
  const admin = createAdminClient();
  await admin.from('product_variants').delete().eq('product_id', productId);

  if (variants.length === 0) return 0;

  const rows = variants.map((v, i) => ({
    product_id: productId,
    sku: v.sku?.trim() || null,
    size: v.size?.trim() || null,
    color: v.color?.trim() || null,
    price: v.price ?? null,
    stock: v.stock ?? 0,
    sort_order: i,
  }));

  const { error } = await (admin as any).from('product_variants').insert(rows);
  if (error) throw error;

  const totalStock = rows.reduce((s, r) => s + r.stock, 0);
  await (admin as any).from('products').update({ stock: totalStock }).eq('id', productId);
  return totalStock;
}

export async function syncProductOptionGroups(
  productId: string,
  groups: OptionGroupDraft[]
): Promise<void> {
  const admin = createAdminClient();
  await admin.from('product_option_groups').delete().eq('product_id', productId);

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const { data: groupRow, error: groupError } = await (admin as any)
      .from('product_option_groups')
      .insert({
        product_id: productId,
        name: g.name.trim(),
        min_select: g.min_select,
        max_select: Math.max(g.max_select, g.min_select || 1),
        required: g.required,
        sort_order: gi,
      })
      .select('id')
      .single();

    if (groupError) throw groupError;

    const optionRows = g.options.map((o, oi) => ({
      group_id: (groupRow as { id: string }).id,
      name: o.name.trim(),
      price_delta: o.price_delta ?? 0,
      sort_order: oi,
    }));

    const { error: optError } = await (admin as any).from('product_options').insert(optionRows);
    if (optError) throw optError;
  }
}

export async function loadProductVariants(productId: string): Promise<VariantDraft[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('product_variants')
    .select('id, sku, size, color, price, stock')
    .eq('product_id', productId)
    .order('sort_order');

  return ((data || []) as Array<Record<string, unknown>>).map((v) => ({
    id: v.id as string,
    sku: (v.sku as string | null) ?? null,
    size: (v.size as string | null) ?? null,
    color: (v.color as string | null) ?? null,
    price: v.price != null ? Number(v.price) : null,
    stock: Number(v.stock ?? 0),
  }));
}

export async function loadProductOptionGroups(productId: string): Promise<OptionGroupDraft[]> {
  const admin = createAdminClient();
  const { data: groups } = await admin
    .from('product_option_groups')
    .select('id, name, min_select, max_select, required, sort_order')
    .eq('product_id', productId)
    .order('sort_order');

  const result: OptionGroupDraft[] = [];
  for (const g of (groups || []) as Array<Record<string, unknown>>) {
    const { data: options } = await admin
      .from('product_options')
      .select('id, name, price_delta, sort_order')
      .eq('group_id', g.id as string)
      .order('sort_order');

    result.push({
      id: g.id as string,
      name: g.name as string,
      min_select: Number(g.min_select ?? 0),
      max_select: Number(g.max_select ?? 1),
      required: Boolean(g.required),
      options: ((options || []) as Array<Record<string, unknown>>).map((o) => ({
        id: o.id as string,
        name: o.name as string,
        price_delta: Number(o.price_delta ?? 0),
      })),
    });
  }
  return result;
}
