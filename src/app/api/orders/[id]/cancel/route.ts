import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/payment/stripe';
import { createStripeRefund, resolvePaymentIntentId } from '@/lib/payment/refund';
import { restoreStockForOrder } from '@/lib/inventory';
import type { Database } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };
type Order = Database['public']['Tables']['orders']['Row'];

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const row = order as Order;
  const admin = createAdminClient();

  if (row.status === 'pending') {
    if (row.stripe_payment_id?.startsWith('cs_')) {
      try {
        const stripe = getStripe();
        await stripe.checkout.sessions.expire(row.stripe_payment_id);
      } catch (err) {
        console.warn('[cancel] expire checkout session:', err);
      }
    }

    const { data, error: updateError } = await (admin as any)
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: '訂單狀態已變更，無法取消' }, { status: 409 });
    }

    return NextResponse.json(data);
  }

  if (row.status === 'paid') {
    try {
      const paymentIntentId = await resolvePaymentIntentId(row.stripe_payment_id);
      if (!paymentIntentId) {
        return NextResponse.json({ error: '找不到 Stripe 付款記錄' }, { status: 400 });
      }

      await createStripeRefund(paymentIntentId);
      await restoreStockForOrder(id);

      const { data, error: updateError } = await (admin as any)
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', id)
        .eq('status', 'paid')
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: '訂單狀態已變更，無法取消' }, { status: 409 });
      }

      return NextResponse.json(data);
    } catch (err) {
      console.error('[cancel] paid order:', err);
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: '此訂單狀態無法取消' }, { status: 400 });
}
