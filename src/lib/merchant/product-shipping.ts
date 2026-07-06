import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { parseOrderItems } from '@/lib/orders/types';

type ProductFeeRow = {
  id: string;
  merchant_id: string;
  checkout_shipping_fee: number | null;
  courier_fee?: number | null;
};

/** 依購物車商品計算各商家的結帳運費（同商家多商品取最高值） */
export function computeMerchantShippingFees(
  items: { id: string }[],
  products: ProductFeeRow[]
): Map<string, number> {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const fees = new Map<string, number>();

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) continue;
    const fee = roundMoney(Number(product.checkout_shipping_fee ?? 0));
    fees.set(product.merchant_id, Math.max(fees.get(product.merchant_id) ?? 0, fee));
  }

  return fees;
}

/** 依訂單商品解析配送員基本工資（有設定則取最高覆寫值，否則用商家預設） */
export async function resolveOrderCourierBaseFee(
  merchantId: string,
  orderId: string,
  merchantDefaultFee: number
): Promise<number> {
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('items')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return merchantDefaultFee;

  const productIds = parseOrderItems((order as { items: unknown }).items)
    .map((i) => i.product_id)
    .filter(Boolean);

  if (productIds.length === 0) return merchantDefaultFee;

  const { data: products } = await supabase
    .from('products')
    .select('id, courier_fee')
    .in('id', productIds)
    .eq('merchant_id', merchantId);

  let maxOverride: number | null = null;
  for (const p of (products || []) as { courier_fee: number | null }[]) {
    if (p.courier_fee == null) continue;
    const fee = roundMoney(Number(p.courier_fee));
    maxOverride = maxOverride == null ? fee : Math.max(maxOverride, fee);
  }

  return maxOverride ?? merchantDefaultFee;
}
