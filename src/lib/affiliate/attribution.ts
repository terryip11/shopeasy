import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  clampCommissionRate,
  getAffiliatePlatformSettings,
} from '@/lib/affiliate/settings';

export type ShareAttribution = {
  shareLinkId: string;
  promoterId: string;
  commissionRate: number;
};

type ShareLinkRow = {
  id: string;
  promoter_id: string;
  product_id: string;
  merchant_id: string;
};

type ProductAffiliateRow = {
  id: string;
  merchant_id: string;
  share_enabled: boolean;
  commission_rate: number | null;
  status: string;
};

/**
 * 結帳時解析分享歸屬（last-click ref code）。
 * 付款成功後佣金僅以「被分享商品」在訂單內的金額為基數。
 */
export async function resolveShareAttribution(input: {
  refCode: string | null | undefined;
  productIds: string[];
  buyerId: string;
  merchantId: string;
}): Promise<ShareAttribution | null> {
  const code = input.refCode?.trim();
  if (!code) return null;

  const platform = await getAffiliatePlatformSettings();
  if (!platform.enabled) return null;

  const supabase = createAdminClient();

  const { data: linkData } = await (supabase as any)
    .from('share_links')
    .select('id, promoter_id, product_id, merchant_id')
    .eq('code', code)
    .maybeSingle();

  const link = linkData as ShareLinkRow | null;
  if (!link) return null;
  if (link.merchant_id !== input.merchantId) return null;
  if (!input.productIds.includes(link.product_id)) return null;
  if (link.promoter_id === input.buyerId) return null;

  const { data: promoterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', link.promoter_id)
    .maybeSingle();

  if ((promoterProfile as { role?: string } | null)?.role !== 'promoter') {
    return null;
  }

  const { data: merchantRow } = await supabase
    .from('merchants')
    .select('user_id')
    .eq('id', input.merchantId)
    .maybeSingle();

  if ((merchantRow as { user_id?: string } | null)?.user_id === link.promoter_id) {
    return null;
  }

  const { data: affiliateSettings } = await (supabase as any)
    .from('merchant_affiliate_settings')
    .select('enabled, default_commission_rate')
    .eq('merchant_id', input.merchantId)
    .maybeSingle();

  if (!(affiliateSettings as { enabled?: boolean } | null)?.enabled) {
    return null;
  }

  const { data: productData } = await supabase
    .from('products')
    .select('id, merchant_id, share_enabled, commission_rate, status')
    .eq('id', link.product_id)
    .maybeSingle();

  const product = productData as ProductAffiliateRow | null;
  if (!product || product.status !== 'published' || !product.share_enabled) {
    return null;
  }

  const defaultRate = Number(
    (affiliateSettings as { default_commission_rate?: number }).default_commission_rate ?? 0.1
  );
  const rawRate = product.commission_rate ?? defaultRate;
  const commissionRate = clampCommissionRate(rawRate, platform);

  return {
    shareLinkId: link.id,
    promoterId: link.promoter_id,
    commissionRate,
  };
}
