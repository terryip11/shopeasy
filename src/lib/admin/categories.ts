import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
};

export async function getAdminCategoriesList(page = 1, limit = 100): Promise<{
  categories: AdminCategoryRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}> {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order, created_at', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const categories = (data || []) as AdminCategoryRow[];
  const totalCount = count ?? categories.length;

  return {
    categories,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}
