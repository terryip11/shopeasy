import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import { markOrdersPaid } from '@/lib/orders/mark-paid';
import {
  assertMerchantCanCoverOfflineFee,
  estimateOfflinePlatformFeeForOrder,
} from '@/lib/finance/platform-credit';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

type RouteContext = { params: Promise<{ id: string }> };

/** 商家確認已收到線下付款 */
export async function POST(_request: Request, context: RouteContext) {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, payment_method, merchant_id')
    .eq('id', id)
    .eq('merchant_id', merchant.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const row = order as {
    id: string;
    status: string;
    payment_method: string | null;
    merchant_id: string;
  };

  if (row.status !== 'pending') {
    return NextResponse.json({ error: '僅待付款訂單可確認收款' }, { status: 400 });
  }

  const method = (row.payment_method || 'card') as MerchantPaymentMethod;
  if (!isManualPaymentMethod(method)) {
    return NextResponse.json({ error: '信用卡訂單請等待 Stripe 自動確認' }, { status: 400 });
  }

  const estimate = await estimateOfflinePlatformFeeForOrder(row.id);
  const creditCheck = await assertMerchantCanCoverOfflineFee(merchant.id, estimate.fee);
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.error }, { status: 400 });
  }

  try {
    const result = await markOrdersPaid([row.id]);
    if (result.updated === 0) {
      const creditError = result.errors.find((e) => e.includes('預付餘額'));
      return NextResponse.json(
        { error: creditError?.replace(/^\[markOrdersPaid\] [^:]+:\s*/, '') || '訂單狀態已變更，請重新整理' },
        { status: creditError ? 400 : 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      status: 'paid',
      platform_fee: estimate.fee,
      credit_balance: creditCheck.balance - estimate.fee,
    });
  } catch (err) {
    console.error('[merchant/confirm-payment]', err);
    return NextResponse.json({ error: '確認收款失敗' }, { status: 500 });
  }
}
