import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { parseOrderItems } from '@/lib/orders/types';

type ProductStock = { id: string; stock: number };
type VariantStock = { id: string; stock: number; product_id: string };

async function deductVariantStock(variantId: string, quantity: number) {
  const supabase = createAdminClient();
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, stock, product_id')
    .eq('id', variantId)
    .single();

  if (!variant) return;
  const row = variant as VariantStock;
  const next = Math.max(0, row.stock - quantity);
  await (supabase as any).from('product_variants').update({ stock: next }).eq('id', variantId);

  const { data: siblings } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('product_id', row.product_id);
  const total = ((siblings || []) as { stock: number }[]).reduce((s, v) => s + v.stock, 0);
  await (supabase as any).from('products').update({ stock: total }).eq('id', row.product_id);
}

/**
 * 付款成功後扣減庫存
 */
export async function deductStockForOrders(orderIds: string[]) {
  const supabase = createAdminClient();

  for (const orderId of orderIds) {
    const { data: order } = await supabase
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .single();

    if (!order) continue;

    const items = parseOrderItems((order as { items: unknown }).items);
    for (const item of items) {
      if (item.variant_id) {
        await deductVariantStock(item.variant_id, item.quantity);
        continue;
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, stock')
        .eq('id', item.product_id)
        .single();

      if (!product) continue;

      const current = (product as ProductStock).stock;
      const next = Math.max(0, current - item.quantity);
      await (supabase as any).from('products').update({ stock: next }).eq('id', item.product_id);
    }
  }
}

async function restoreVariantStock(variantId: string, quantity: number) {
  const supabase = createAdminClient();
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, stock, product_id')
    .eq('id', variantId)
    .single();

  if (!variant) return;
  const row = variant as VariantStock;
  await (supabase as any)
    .from('product_variants')
    .update({ stock: row.stock + quantity })
    .eq('id', variantId);

  const { data: siblings } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('product_id', row.product_id);
  const total = ((siblings || []) as { stock: number }[]).reduce((s, v) => s + v.stock, 0);
  await (supabase as any).from('products').update({ stock: total }).eq('id', row.product_id);
}

/**
 * 取消已付款訂單時還原庫存
 */
export async function restoreStockForOrder(orderId: string) {
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('items')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const items = parseOrderItems((order as { items: unknown }).items);
  for (const item of items) {
    if (item.variant_id) {
      await restoreVariantStock(item.variant_id, item.quantity);
      continue;
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', item.product_id)
      .single();

    if (!product) continue;

    const current = (product as ProductStock).stock;
    await (supabase as any)
      .from('products')
      .update({ stock: current + item.quantity })
      .eq('id', item.product_id);
  }
}

type CheckoutLine = {
  id: string;
  name: string;
  quantity: number;
  variant_id?: string;
};

/**
 * 結帳前驗證庫存是否足夠
 */
export async function validateStockAsync(items: CheckoutLine[]): Promise<string | null> {
  const supabase = createAdminClient();
  const productIds = [...new Set(items.map((i) => i.id))];

  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock')
    .in('id', productIds);

  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product_id, stock, size, color')
    .in('product_id', productIds);

  const productMap = new Map(
    ((products || []) as { id: string; name: string; stock: number }[]).map((p) => [p.id, p])
  );
  const variantRows = (variants || []) as {
    id: string;
    product_id: string;
    stock: number;
    size: string | null;
    color: string | null;
  }[];
  const variantMap = new Map(
    variantRows.map((v) => [v.id, v])
  );
  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  for (const item of items) {
    if (item.variant_id) {
      const variant = variantMap.get(item.variant_id);
      if (!variant) return `商品「${item.name}」規格不存在或已下架`;
      if (variant.stock < item.quantity) {
        const label = [variant.size, variant.color].filter(Boolean).join(' / ') || '規格';
        return `「${item.name}（${label}）」庫存不足（剩餘 ${variant.stock} 件）`;
      }
      continue;
    }

    const product = productMap.get(item.id);
    if (!product) continue;

    const hasVariants = (variantsByProduct.get(item.id)?.length ?? 0) > 0;
    if (hasVariants) {
      return `請為「${item.name}」選擇呎碼／顏色規格`;
    }

    if (product.stock < item.quantity) {
      return `商品「${item.name}」庫存不足（剩餘 ${product.stock} 件）`;
    }
  }

  return null;
}

/** @deprecated 使用 validateStockAsync */
export function validateStock(
  items: { id: string; name: string; quantity: number }[],
  products: { id: string; name: string; stock: number }[]
): string | null {
  const stockMap = new Map(products.map((p) => [p.id, p.stock]));

  for (const item of items) {
    const stock = stockMap.get(item.id);
    if (stock === undefined) continue;
    if (stock < item.quantity) {
      return `商品「${item.name}」庫存不足（剩餘 ${stock} 件）`;
    }
  }

  return null;
}
