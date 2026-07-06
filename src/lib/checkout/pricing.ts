import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckoutItem } from '@/lib/checkout/shipping';
import type { Database } from '@/types/database';

type ProductRow = {
  id: string;
  name: string;
  price: number;
};

type VariantRow = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  price: number | null;
};

type OptionRow = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
};

type OptionGroupRow = {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: OptionRow[];
};

export type ResolvedCheckoutItem = CheckoutItem & {
  price: number;
  variant_label?: string;
  option_selections?: Array<{
    group_id: string;
    option_ids: string[];
    labels: string[];
    price_delta: number;
  }>;
};

function variantLabel(v: VariantRow): string {
  return [v.size, v.color].filter(Boolean).join(' / ');
}

function priceClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.01;
}

/** 從資料庫重算並驗證購物車單價（含規格與餐飲選項） */
export async function resolveCheckoutItemPrices(
  supabase: SupabaseClient<Database>,
  items: CheckoutItem[],
  productMap: Map<string, ProductRow>
): Promise<{ items: ResolvedCheckoutItem[] } | { error: string }> {
  const productIds = [...new Set(items.map((i) => i.id))];

  const [{ data: variantRows }, { data: groupRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, product_id, size, color, price')
      .in('product_id', productIds),
    supabase
      .from('product_option_groups')
      .select('id, product_id, name, min_select, max_select, required')
      .in('product_id', productIds),
  ]);

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of (variantRows || []) as VariantRow[]) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const groupsByProduct = new Map<string, OptionGroupRow[]>();
  const allGroupRows = (groupRows || []) as Array<Omit<OptionGroupRow, 'options'>>;
  const allGroupIds = allGroupRows.map((g) => g.id);

  let allOptions: OptionRow[] = [];
  if (allGroupIds.length > 0) {
    const { data: optionRows } = await supabase
      .from('product_options')
      .select('id, group_id, name, price_delta')
      .in('group_id', allGroupIds)
      .order('sort_order');
    allOptions = ((optionRows || []) as OptionRow[]).map((o) => ({
      ...o,
      price_delta: Number(o.price_delta),
    }));
  }

  const optionsByGroup = new Map<string, OptionRow[]>();
  for (const opt of allOptions) {
    const list = optionsByGroup.get(opt.group_id) ?? [];
    list.push(opt);
    optionsByGroup.set(opt.group_id, list);
  }

  for (const g of allGroupRows) {
    const group: OptionGroupRow = {
      ...g,
      options: optionsByGroup.get(g.id) ?? [],
    };
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push(group);
    groupsByProduct.set(g.product_id, list);
  }

  const resolved: ResolvedCheckoutItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return { error: `商品 ${item.name} 不存在或已下架` };
    }

    const variants = variantsByProduct.get(item.id) ?? [];
    const optionGroups = groupsByProduct.get(item.id) ?? [];

    let unitPrice = Number(product.price);
    let variantLabel: string | undefined;

    if (variants.length > 0) {
      if (!item.variant_id) {
        return { error: `請為「${product.name}」選擇呎碼／顏色規格` };
      }
      const variant = variants.find((v) => v.id === item.variant_id);
      if (!variant) {
        return { error: `商品「${product.name}」規格不存在或已下架` };
      }
      unitPrice = variant.price != null ? Number(variant.price) : unitPrice;
      variantLabel = variantLabelText(variant);
    } else if (item.variant_id) {
      return { error: `商品「${product.name}」無可選規格` };
    }

    const selectionsByGroup = new Map(
      (item.option_selections ?? []).map((s) => [s.group_id, s.option_ids])
    );

    const normalizedSelections: ResolvedCheckoutItem['option_selections'] = [];

    for (const group of optionGroups) {
      const selectedIds = selectionsByGroup.get(group.id) ?? [];
      const uniqueIds = [...new Set(selectedIds)];

      if (group.required && uniqueIds.length === 0) {
        return { error: `請選擇「${product.name}」的${group.name}` };
      }
      if (uniqueIds.length < group.min_select) {
        return { error: `「${product.name}」的${group.name}至少需選 ${group.min_select} 項` };
      }
      if (uniqueIds.length > group.max_select) {
        return { error: `「${product.name}」的${group.name}最多可選 ${group.max_select} 項` };
      }

      if (uniqueIds.length === 0) continue;

      const labels: string[] = [];
      let priceDelta = 0;
      for (const optId of uniqueIds) {
        const opt = group.options.find((o) => o.id === optId);
        if (!opt) {
          return { error: `商品「${product.name}」的選項無效，請刷新後重試` };
        }
        labels.push(opt.name);
        priceDelta += Number(opt.price_delta);
      }

      unitPrice += priceDelta;
      normalizedSelections.push({
        group_id: group.id,
        option_ids: uniqueIds,
        labels,
        price_delta: priceDelta,
      });
    }

    if (optionGroups.length === 0 && (item.option_selections?.length ?? 0) > 0) {
      return { error: `商品「${product.name}」無可選加料，請刷新購物車` };
    }

    if (!priceClose(unitPrice, item.price)) {
      return { error: `商品 ${product.name} 價格已變更，請刷新購物車` };
    }

    resolved.push({
      ...item,
      price: unitPrice,
      name: product.name,
      ...(variantLabel ? { variant_label: variantLabel } : {}),
      ...(normalizedSelections.length ? { option_selections: normalizedSelections } : {}),
    });
  }

  return { items: resolved };
}

function variantLabelText(v: VariantRow): string {
  return variantLabel(v) || '規格';
}

/** 純函式定價邏輯（供單元測試） */
export function computeLineUnitPrice(input: {
  basePrice: number;
  variants: VariantRow[];
  variantId?: string;
  optionGroups: OptionGroupRow[];
  optionSelections?: Array<{ group_id: string; option_ids: string[] }>;
}): { price: number; variantLabel?: string; error?: string } {
  let unitPrice = input.basePrice;
  let variantLabel: string | undefined;

  if (input.variants.length > 0) {
    if (!input.variantId) return { price: 0, error: '需要選擇規格' };
    const variant = input.variants.find((v) => v.id === input.variantId);
    if (!variant) return { price: 0, error: '規格不存在' };
    unitPrice = variant.price != null ? Number(variant.price) : unitPrice;
    variantLabel = variantLabelText(variant);
  }

  const selectionsByGroup = new Map(
    (input.optionSelections ?? []).map((s) => [s.group_id, s.option_ids])
  );

  for (const group of input.optionGroups) {
    const ids = [...new Set(selectionsByGroup.get(group.id) ?? [])];
    if (group.required && ids.length === 0) {
      return { price: 0, error: `缺少必填選項：${group.name}` };
    }
    for (const optId of ids) {
      const opt = group.options.find((o) => o.id === optId);
      if (!opt) return { price: 0, error: '選項無效' };
      unitPrice += Number(opt.price_delta);
    }
  }

  return { price: unitPrice, variantLabel };
}
