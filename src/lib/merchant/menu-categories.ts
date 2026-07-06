import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type MenuCategory = import('@/lib/merchant/product-form-types').MenuCategory;

export async function listMenuCategories(merchantId: string): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('merchant_menu_categories')
    .select('id, merchant_id, name, sort_order')
    .eq('merchant_id', merchantId)
    .order('sort_order')
    .order('name');

  return (data || []) as MenuCategory[];
}

export async function createMenuCategory(merchantId: string, name: string): Promise<MenuCategory> {
  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('merchant_menu_categories')
    .insert({ merchant_id: merchantId, name: name.trim() })
    .select('id, merchant_id, name, sort_order')
    .single();

  if (error) throw error;
  return data as MenuCategory;
}
