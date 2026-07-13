import 'server-only';

import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export function generateShareCode(): string {
  return randomBytes(5).toString('hex');
}

export async function getOrCreateShareLink(
  promoterId: string,
  productId: string
): Promise<{ ok: true; code: string; id: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await (supabase as any)
    .from('share_links')
    .select('id, code')
    .eq('promoter_id', promoterId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    return { ok: true, code: existing.code as string, id: existing.id as string };
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, merchant_id, share_enabled, status')
    .eq('id', productId)
    .maybeSingle();

  const row = product as {
    id: string;
    merchant_id: string;
    share_enabled?: boolean;
    status: string;
  } | null;

  if (!row || row.status !== 'published' || !row.share_enabled) {
    return { ok: false, error: '此商品未開放分享推廣' };
  }

  const { data: settings } = await (supabase as any)
    .from('merchant_affiliate_settings')
    .select('enabled')
    .eq('merchant_id', row.merchant_id)
    .maybeSingle();

  if (!(settings as { enabled?: boolean } | null)?.enabled) {
    return { ok: false, error: '商家尚未開啟分享推廣計劃' };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShareCode();
    const { data, error } = await (supabase as any)
      .from('share_links')
      .insert({
        code,
        promoter_id: promoterId,
        product_id: productId,
        merchant_id: row.merchant_id,
      })
      .select('id, code')
      .single();

    if (!error && data) {
      return { ok: true, code: data.code as string, id: data.id as string };
    }

    if (!error?.message?.includes('duplicate') && !error?.message?.includes('unique')) {
      return { ok: false, error: error?.message || '建立分享連結失敗' };
    }
  }

  return { ok: false, error: '建立分享連結失敗，請稍後再試' };
}
