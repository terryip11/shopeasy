import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import { notifyMerchantBuyerClaimedPayment } from '@/lib/push/notify-order';

type OrderRow = {
  id: string;
  user_id: string;
  merchant_id: string | null;
  status: string;
  payment_method: string | null;
  buyer_payment_claimed_at: string | null;
};

/** 買家回報已完成線下付款（待商家確認） */
export async function claimBuyerPayment(orderIds: string[], userId: string) {
  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, user_id, merchant_id, status, payment_method, buyer_payment_claimed_at')
    .in('id', orderIds)
    .eq('user_id', userId);

  if (error) throw error;

  const list = (orders || []) as OrderRow[];
  if (list.length === 0) {
    throw new Error('NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updatedIds: string[] = [];

  for (const order of list) {
    if (order.status !== 'pending') {
      throw new Error('NOT_PENDING');
    }

    const method = (order.payment_method || 'card') as MerchantPaymentMethod;
    if (!isManualPaymentMethod(method)) {
      throw new Error('NOT_MANUAL');
    }

    if (order.buyer_payment_claimed_at) continue;

    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({ buyer_payment_claimed_at: now })
      .eq('id', order.id)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (updateError) throw updateError;
    updatedIds.push(order.id);
    if (order.merchant_id) {
      void notifyMerchantBuyerClaimedPayment(order.id, order.merchant_id);
    }
  }

  return { updated: updatedIds.length, orderIds: updatedIds };
}
