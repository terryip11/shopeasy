import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStripeRefund, resolvePaymentIntentId } from '@/lib/payment/refund';
import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import { restoreStockForOrder } from '@/lib/inventory';
import { reverseOrderLedger } from '@/lib/finance/ledger';
import { reverseCourierEarningsForOrder } from '@/lib/finance/courier-earnings';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import type { Database } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };
type Order = Database['public']['Tables']['orders']['Row'];

async function getMerchantOrder(orderId: string) {
  const auth = await requireRole(['merchant', 'admin', 'super_admin']);
  if (!auth.authorized) {
    return {
      error: NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 }),
      order: null,
    };
  }

  const merchant = await getMerchantForUser();
  if (!merchant) {
    return {
      error: NextResponse.json({ error: '請先建立店鋪' }, { status: 400 }),
      order: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('merchant_id', merchant.id)
    .single();

  if (error || !data) {
    return {
      error: NextResponse.json({ error: '訂單不存在' }, { status: 404 }),
      order: null,
    };
  }

  return { error: null, order: data as Order };
}

function usesStripeRefund(order: Order): boolean {
  const method = order.payment_method as MerchantPaymentMethod | null;
  if (method && isManualPaymentMethod(method)) return false;

  const sid = order.stripe_payment_id;
  if (!sid || sid.startsWith('dev_')) return false;

  return sid.startsWith('pi_') || sid.startsWith('cs_');
}

async function markOrderRefunded(orderId: string, expectedStatus: Order['status']) {
  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', orderId)
    .eq('status', expectedStatus)
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  if (!data) {
    return { error: '訂單狀態已變更，請刷新頁面後重試', data: null };
  }
  return { error: null, data };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await getMerchantOrder(id);
  if (result.error) return result.error;

  const order = result.order!;

  if (
    order.status !== 'paid' &&
    order.status !== 'shipped' &&
    order.status !== 'refund_requested'
  ) {
    return NextResponse.json(
      { error: '僅已付款、已發貨或退款申請中的訂單可退款' },
      { status: 400 }
    );
  }

  try {
    if (usesStripeRefund(order)) {
      const paymentIntentId = await resolvePaymentIntentId(order.stripe_payment_id);
      if (!paymentIntentId) {
        return NextResponse.json({ error: '找不到 Stripe 付款記錄' }, { status: 400 });
      }
      await createStripeRefund(paymentIntentId);
    }

    await restoreStockForOrder(id);
    await reverseOrderLedger(id);
    await reverseCourierEarningsForOrder(id);

    const updated = await markOrderRefunded(id, order.status);
    if (updated.error) {
      return NextResponse.json({ error: updated.error }, { status: 500 });
    }

    return NextResponse.json({
      ...updated.data,
      stripe_refund: usesStripeRefund(order),
    });
  } catch (err) {
    console.error('[merchant/refund]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
