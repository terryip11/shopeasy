/**
 * 店鋪公開頁資料
 */

import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/products';
import type { Database } from '@/types/database';

export type StorePageMerchant = Database['public']['Tables']['merchants']['Row'];

export type StoreCategory = {
  slug: string;
  name: string;
};

const PRODUCT_SELECT = `
  *,
  merchants (name, slug),
  categories (name, slug)
`;

export async function getActiveMerchantBySlug(
  slug: string
): Promise<StorePageMerchant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[store-page] 讀取商家失敗:', error.message);
    return null;
  }

  return data;
}

export async function getStoreCategories(merchantId: string): Promise<StoreCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('categories (slug, name)')
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .not('category_id', 'is', null);

  if (error) {
    console.error('[store-page] 讀取店內分類失敗:', error.message);
    return [];
  }

  type CategoryRow = { categories: { slug: string; name: string } | null };
  const rows = (data ?? []) as CategoryRow[];

  const map = new Map<string, StoreCategory>();
  for (const row of rows) {
    const cat = row.categories;
    if (cat?.slug && cat?.name) {
      map.set(cat.slug, { slug: cat.slug, name: cat.name });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

export async function getStoreProducts(
  merchantId: string,
  options: { q?: string; categorySlug?: string } = {}
): Promise<Product[]> {
  const supabase = await createClient();
  const { q, categorySlug } = options;

  let categoryId: string | null = null;
  if (categorySlug?.trim()) {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug.trim())
      .maybeSingle();
    const category = categoryData as { id: string } | null;
    categoryId = category?.id ?? null;
    if (!categoryId) return [];
  }

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const needle = q?.trim();
  if (needle) {
    query = query.or(`name.ilike.%${needle}%,description.ilike.%${needle}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[store-page] 讀取店內商品失敗:', error.message);
    return [];
  }

  return (data ?? []) as Product[];
}

export async function getStoreProductCount(merchantId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'published');

  if (error) {
    console.error('[store-page] 讀取商品數量失敗:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getStoreFeaturedProducts(
  merchantId: string,
  limit = 4
): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[store-page] 讀取精選商品失敗:', error.message);
    return [];
  }

  return (data ?? []) as Product[];
}

export type StoreShippingHint = {
  minFee: number | null;
  maxFee: number | null;
};

export async function getStoreShippingHint(merchantId: string): Promise<StoreShippingHint> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('checkout_shipping_fee')
    .eq('merchant_id', merchantId)
    .eq('status', 'published');

  if (error) {
    console.error('[store-page] 讀取運費提示失敗:', error.message);
    return { minFee: null, maxFee: null };
  }

  const fees = (data ?? [])
    .map((row) => Number((row as { checkout_shipping_fee?: number }).checkout_shipping_fee ?? 0))
    .filter((fee) => fee > 0);

  if (fees.length === 0) {
    return { minFee: null, maxFee: null };
  }

  return {
    minFee: Math.min(...fees),
    maxFee: Math.max(...fees),
  };
}
