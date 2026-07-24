/**
 * src/lib/categories.ts
 * 分类数据服务（公開列表短快取，減少重複打 Supabase）
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { CACHE_TAGS } from '@/lib/cache-tags';

export type Category = {
  id: string;
  name: string;
  slug: string;
};

const CATEGORIES_REVALIDATE_SEC = 300; // 5 分鐘；admin 變更會立即 bust tag

const loadCategories = unstable_cache(
  async (limit: number): Promise<Category[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('取得分類失敗:', error);
      return [];
    }

    return (data || []) as Category[];
  },
  ['categories-list'],
  { revalidate: CATEGORIES_REVALIDATE_SEC, tags: [CACHE_TAGS.categories] }
);

export async function getCategories(limit = 6): Promise<Category[]> {
  return loadCategories(limit);
}

const loadCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('取得分類失敗:', error);
      return null;
    }

    return data as Category | null;
  },
  ['category-by-slug'],
  { revalidate: CATEGORIES_REVALIDATE_SEC, tags: [CACHE_TAGS.categories] }
);

/** 同 request 去重 + 跨 request 短快取 */
export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  return loadCategoryBySlug(slug);
});
