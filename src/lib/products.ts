/**
 * 商品資料服務（列表／搜尋用精簡欄位，避免 select *）
 */

import { createClient } from '@/lib/supabase/server';
import { getCategoryBySlug } from '@/lib/categories';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  merchant_id: string;
  category_id: string;
  stock?: number;
  status?: string;
  created_at: string;
  merchants?: {
    name: string;
    slug: string;
  };
  categories?: {
    name: string;
    slug: string;
  };
};

/** 列表卡只需首圖與展示欄位，不含 attributes／運費等大欄 */
export const PRODUCT_LIST_SELECT = `
  id,
  name,
  description,
  price,
  images,
  merchant_id,
  category_id,
  created_at,
  merchants (name, slug),
  categories (name, slug)
`;

function mapListProduct(row: Record<string, unknown>): Product {
  const images = Array.isArray(row.images) ? (row.images as string[]).slice(0, 1) : [];
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    price: Number(row.price),
    images,
    merchant_id: row.merchant_id as string,
    category_id: (row.category_id as string) ?? '',
    created_at: row.created_at as string,
    merchants: row.merchants as Product['merchants'],
    categories: row.categories as Product['categories'],
  };
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('取得商品失敗:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapListProduct);
}

export async function searchProducts(query: string, limit = 24): Promise<Product[]> {
  const q = query.trim();
  if (!q) return getFeaturedProducts(limit);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('status', 'published')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('搜尋商品失敗:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapListProduct);
}

export async function getProductsByCategory(categorySlug: string, limit = 24): Promise<Product[]> {
  const supabase = await createClient();
  const category = await getCategoryBySlug(categorySlug);

  if (!category) return [];

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('category_id', category.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('依分類取得商品失敗:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapListProduct);
}

/** 商品首頁：搜尋＋分類在 DB 一次篩完，避免先拉全部分類再記憶體 filter */
export async function getProductsForFeed(options: {
  q?: string;
  categorySlug?: string;
  limit?: number;
}): Promise<Product[]> {
  const { q, categorySlug, limit = 24 } = options;
  const needle = q?.trim();

  if (!categorySlug && !needle) {
    return getFeaturedProducts(limit);
  }

  if (categorySlug && !needle) {
    return getProductsByCategory(categorySlug, limit);
  }

  if (!categorySlug && needle) {
    return searchProducts(needle, limit);
  }

  // 同時有分類＋關鍵字
  const category = await getCategoryBySlug(categorySlug!);
  if (!category) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('category_id', category.id)
    .eq('status', 'published')
    .or(`name.ilike.%${needle}%,description.ilike.%${needle}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('分類搜尋商品失敗:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapListProduct);
}
