/**
 * src/lib/merchants.ts
 * 商家数据服务
 */

import { createClient } from '@/lib/supabase/server';

export type Merchant = {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  logo_url?: string | null;
};

export async function getFeaturedMerchants(limit = 4): Promise<Merchant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('status', 'active')
    .order('name')
    .limit(limit);

  if (error) {
    console.error('Error fetching merchants:', error);
    return [];
  }

  return data || [];
}

