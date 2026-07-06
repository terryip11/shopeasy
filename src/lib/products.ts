/**
 * 商品資料服務
 */

import { createClient } from '@/lib/supabase/server';

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

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      merchants (name, slug),
      categories (name, slug)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('取得商品失敗:', error);
    return [];
  }

  return data || [];
}

export async function searchProducts(query: string, limit = 24): Promise<Product[]> {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return getFeaturedProducts(limit);

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      merchants (name, slug),
      categories (name, slug)
    `)
    .eq('status', 'published')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('搜尋商品失敗:', error);
    return [];
  }

  return data || [];
}
export async function getProductsByCategory(categorySlug: string, limit = 24): Promise<Product[]> {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle();

  if (!category) return [];

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      merchants (name, slug),
      categories (name, slug)
    `)
    .eq('category_id', (category as { id: string }).id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('依分類取得商品失敗:', error);
    return [];
  }

  return data || [];
}

/** 商品首頁：支援搜尋 + 分類篩選 */
export async function getProductsForFeed(options: {
  q?: string;
  categorySlug?: string;
  limit?: number;
}): Promise<Product[]> {
  const { q, categorySlug, limit = 24 } = options;

  if (categorySlug) {
    const byCategory = await getProductsByCategory(categorySlug, limit);
    if (!q?.trim()) return byCategory;
    const needle = q.trim().toLowerCase();
    return byCategory.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description?.toLowerCase().includes(needle) ?? false)
    );
  }

  if (q?.trim()) return searchProducts(q, limit);
  return getFeaturedProducts(limit);
}
