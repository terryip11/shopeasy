import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import {
  computeAffiliateCommission,
  sumSharedProductSubtotal,
  type AffiliateCommissionSnapshot,
} from '@/lib/affiliate/commission-base';

export type { AffiliateCommissionSnapshot };
export { computeAffiliateCommission };

type OrderAffiliateRow = {
  id: string;
  merchant_id: string | null;
  subtotal: number | null;
  total: number;
  items: unknown;
  share_link_id: string | null;
  promoter_id: string | null;
  affiliate_commission_rate: number | null;
  affiliate_status: string | null;
};

/** 付款成功後寫入分享佣金（冪等） */
export async function recordAffiliateCommission(
  orderId: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await (supabase as any)
    .from('promoter_earnings')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    return { ok: true, skipped: true };
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, merchant_id, subtotal, total, items, share_link_id, promoter_id, affiliate_commission_rate, affiliate_status'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return { ok: false, error: orderError?.message || '訂單不存在' };
  }

  const order = orderData as OrderAffiliateRow;
  if (!order.share_link_id || !order.promoter_id || !order.affiliate_commission_rate) {
    return { ok: true, skipped: true };
  }

  if (order.affiliate_status === 'reversed') {
    return { ok: true, skipped: true };
  }

  const { data: linkData } = await (supabase as any)
    .from('share_links')
    .select('product_id')
    .eq('id', order.share_link_id)
    .maybeSingle();

  const sharedProductId = (linkData as { product_id?: string } | null)?.product_id;
  if (!sharedProductId) {
    return { ok: false, error: '分享連結不存在' };
  }

  const platform = await getAffiliatePlatformSettings();
  const commissionBase = sumSharedProductSubtotal(order.items, sharedProductId);

  if (commissionBase <= 0) {
    return { ok: true, skipped: true };
  }

  const snapshot = computeAffiliateCommission(
    commissionBase,
    Number(order.affiliate_commission_rate),
    platform.platformCutRate
  );

  if (snapshot.commissionGross <= 0) {
    return { ok: true, skipped: true };
  }

  const { error: orderPatchError } = await (supabase as any)
    .from('orders')
    .update({
      affiliate_commission_amount: snapshot.commissionGross,
      affiliate_platform_fee: snapshot.platformFee,
      affiliate_promoter_net: snapshot.promoterNet,
      affiliate_status: 'confirmed',
    })
    .eq('id', orderId);

  if (orderPatchError) {
    return { ok: false, error: orderPatchError.message };
  }

  const { error: earningsError } = await (supabase as any).from('promoter_earnings').insert({
    promoter_id: order.promoter_id,
    order_id: orderId,
    merchant_id: order.merchant_id,
    share_link_id: order.share_link_id,
    commission_base: snapshot.commissionBase,
    commission_rate: snapshot.commissionRate,
    commission_gross: snapshot.commissionGross,
    platform_fee: snapshot.platformFee,
    net_amount: snapshot.promoterNet,
    status: 'pending',
  });

  if (earningsError) {
    if (earningsError.message?.includes('promoter_earnings')) {
      return { ok: false, error: '請執行 supabase/migrate-v42-affiliate.sql' };
    }
    return { ok: false, error: earningsError.message };
  }

  return { ok: true };
}

export async function reverseAffiliateCommission(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  await (supabase as any)
    .from('orders')
    .update({ affiliate_status: 'reversed' })
    .eq('id', orderId)
    .neq('affiliate_status', 'reversed');

  await (supabase as any)
    .from('promoter_earnings')
    .update({ status: 'reversed' })
    .eq('order_id', orderId)
    .neq('status', 'reversed');
}
