/**
 * 店鋪公開頁資料
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCategoryBySlug } from '@/lib/categories';
import type { Product } from '@/lib/products';
import type { Database } from '@/types/database';

export type StorePageMerchant = Database['public']['Tables']['merchants']['Row'];

export type StoreCategory = {
  slug: string;
  name: string;
};

export type StoreShippingHint = {
  minFee: number | null;
  maxFee: number | null;
};

export type StorePageBundle = {
  products: Product[];
  featuredProducts: Product[];
  productCount: number;
  categories: StoreCategory[];
  shippingHint: StoreShippingHint;
};

/** 店內列表精簡欄位（含運費以一次算出 shipping hint） */
const STORE_PRODUCT_SELECT = `
  id,
  name,
  description,
  price,
  images,
  merchant_id,
  category_id,
  created_at,
  checkout_shipping_fee,
  merchants (name, slug),
  categories (slug, name)
`;

type StoreProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[] | null;
  merchant_id: string;
  category_id: string | null;
  created_at: string;
  checkout_shipping_fee?: number | null;
  merchants?: { name: string; slug: string } | null;
  categories?: { slug: string; name: string } | null;
};

function mapStoreProduct(row: StoreProductRow): Product {
  const images = Array.isArray(row.images) ? row.images.slice(0, 1) : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    images,
    merchant_id: row.merchant_id,
    category_id: row.category_id ?? '',
    created_at: row.created_at,
    merchants: row.merchants ?? undefined,
    categories: row.categories
      ? { name: row.categories.name, slug: row.categories.slug }
      : undefined,
  };
}

function deriveCategories(rows: StoreProductRow[]): StoreCategory[] {
  const map = new Map<string, StoreCategory>();
  for (const row of rows) {
    const cat = row.categories;
    if (cat?.slug && cat?.name) {
      map.set(cat.slug, { slug: cat.slug, name: cat.name });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

function deriveShippingHint(rows: StoreProductRow[]): StoreShippingHint {
  const fees = rows
    .map((row) => Number(row.checkout_shipping_fee ?? 0))
    .filter((fee) => fee > 0);

  if (fees.length === 0) {
    return { minFee: null, maxFee: null };
  }

  return {
    minFee: Math.min(...fees),
    maxFee: Math.max(...fees),
  };
}

/** metadata 與 page 共用，同 request 只查一次 */
export const getActiveMerchantBySlug = cache(
  async (slug: string): Promise<StorePageMerchant | null> => {
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
);

async function fetchPublishedStoreRows(merchantId: string): Promise<StoreProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(STORE_PRODUCT_SELECT)
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[store-page] 讀取店內商品失敗:', error.message);
    return [];
  }

  return (data ?? []) as StoreProductRow[];
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
    const category = await getCategoryBySlug(categorySlug.trim());
    categoryId = category?.id ?? null;
    if (!categoryId) return [];
  }

  let query = supabase
    .from('products')
    .select(STORE_PRODUCT_SELECT)
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

  return ((data ?? []) as StoreProductRow[]).map(mapStoreProduct);
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
    .select(STORE_PRODUCT_SELECT)
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[store-page] 讀取精選商品失敗:', error.message);
    return [];
  }

  return ((data ?? []) as StoreProductRow[]).map(mapStoreProduct);
}

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

  return deriveShippingHint((data ?? []) as StoreProductRow[]);
}

/**
 * 店鋪頁一次組裝資料：
 * - 首頁（無篩選）：1 次 products 查詢推導分類／精選／數量／運費
 * - 有篩選：分類＋篩選商品＋總數（最多 3 次，略過精選／運費重複掃表）
 */
export async function getStorePageBundle(
  merchantId: string,
  options: { q?: string; categorySlug?: string; featuredLimit?: number } = {}
): Promise<StorePageBundle> {
  const { q, categorySlug, featuredLimit = 4 } = options;
  const showHome = !q?.trim() && !categorySlug?.trim();

  if (showHome) {
    const rows = await fetchPublishedStoreRows(merchantId);
    const products = rows.map(mapStoreProduct);
    return {
      products,
      featuredProducts: products.slice(0, featuredLimit),
      productCount: products.length,
      categories: deriveCategories(rows),
      shippingHint: deriveShippingHint(rows),
    };
  }

  const [categories, products, productCount] = await Promise.all([
    getStoreCategories(merchantId),
    getStoreProducts(merchantId, { q, categorySlug }),
    getStoreProductCount(merchantId),
  ]);

  return {
    products,
    featuredProducts: [],
    productCount,
    categories,
    shippingHint: { minFee: null, maxFee: null },
  };
}
