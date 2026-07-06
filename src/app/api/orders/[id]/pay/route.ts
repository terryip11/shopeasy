import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMerchantPaymentOptions, isManualPaymentMethod } from '@/lib/checkout/payment-options';
import { buildResumePaymentResponse } from '@/lib/orders/resume-payment';
import { MERCHANT_PAYMENT_METHODS } from '@/lib/merchant/payment-methods';
import { validatePayoutForMethods } from '@/lib/merchant/payout';
import type { Database } from '@/types/database';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  payment_method: z.enum(MERCHANT_PAYMENT_METHODS),
});

/** 待付款訂單補付款：依所選方式導向 Stripe 或線下收款頁 */
export async function POST(request: NextRequest, context: RouteContext) {
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

  const row = order as Database['public']['Tables']['orders']['Row'];

  if (row.status !== 'pending') {
    return NextResponse.json({ error: '此訂單不是待付款狀態' }, { status: 400 });
  }

  let paymentMethod: MerchantPaymentMethod;
  try {
    const body = bodySchema.parse(await request.json());
    paymentMethod = body.payment_method;
  } catch {
    return NextResponse.json({ error: '請選擇付款方式' }, { status: 400 });
  }

  if (!row.merchant_id) {
    return NextResponse.json({ error: '訂單缺少商家資訊' }, { status: 400 });
  }

  const { merchants, options } = await resolveMerchantPaymentOptions(row.merchant_id);
  const selected = options.find((o) => o.id === paymentMethod);
  if (!selected) {
    return NextResponse.json({ error: '此商家不支援所選付款方式' }, { status: 400 });
  }
  if (!selected.available) {
    return NextResponse.json(
      { error: selected.unavailableReason || '商家收款資料尚未設定完整' },
      { status: 400 }
    );
  }

  if (isManualPaymentMethod(paymentMethod)) {
    for (const m of merchants) {
      const err = validatePayoutForMethods([paymentMethod], m.payout);
      if (err) {
        return NextResponse.json({ error: `${m.merchantName}：${err}` }, { status: 400 });
      }
    }
  }

  try {
    const patch: Record<string, unknown> = { payment_method: paymentMethod };
    if (isManualPaymentMethod(paymentMethod)) {
      patch.stripe_payment_id = null;
    }

    await (supabase as any).from('orders').update(patch).eq('id', id).eq('status', 'pending');

    const result = await buildResumePaymentResponse(
      { ...row, payment_method: paymentMethod },
      user.email,
      paymentMethod
    );

    if (result.type === 'stripe' && result.sessionId) {
      await (supabase as any)
        .from('orders')
        .update({ stripe_payment_id: result.sessionId })
        .eq('id', id)
        .eq('status', 'pending');
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
