/**
 * src/lib/categories.ts
 * 分类数据服务
 */

import { createClient } from '@/lib/supabase/server';

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export async function getCategories(limit = 6): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
    .limit(limit);

  if (error) {
    console.error('取得分類失敗:', error);
    return [];
  }

  return data || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('取得分類失敗:', error);
    return null;
  }

  return data;
}

