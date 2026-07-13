import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getStripe, isStripePaymentsEnabled } from '@/lib/payment/stripe';

type RouteContext = { params: Promise<{ id: string }> };

/** 商家取消待付款訂單（例如買家重複下單） */
export async function POST(_request: Request, context: RouteContext) {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, merchant_id, stripe_payment_id, payment_method')
    .eq('id', id)
    .eq('merchant_id', merchant.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const row = order as {
    id: string;
    status: string;
    stripe_payment_id: string | null;
    payment_method: string | null;
  };

  if (row.status !== 'pending') {
    return NextResponse.json({ error: '僅待付款訂單可取消' }, { status: 400 });
  }

  if (row.stripe_payment_id?.startsWith('cs_') && isStripePaymentsEnabled()) {
    try {
      await getStripe().checkout.sessions.expire(row.stripe_payment_id);
    } catch (err) {
      console.warn('[merchant cancel] expire checkout session:', err);
    }
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await (admin as any)
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('merchant_id', merchant.id)
    .eq('status', 'pending')
    .select('id, status')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '訂單狀態已變更，請重新整理' }, { status: 409 });
  }

  return NextResponse.json(data);
}
