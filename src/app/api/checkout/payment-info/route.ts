import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  formatPayoutForDisplay,
} from '@/lib/checkout/payment-options';
import { payoutFromMerchant } from '@/lib/merchant/payout';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get('orders');
  if (!idsParam) {
    return NextResponse.json({ error: '缺少訂單編號' }, { status: 400 });
  }

  const orderIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (orderIds.length === 0) {
    return NextResponse.json({ error: '訂單編號無效' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, merchant_id, total, status, payment_method, user_id')
    .in('id', orderIds)
    .eq('user_id', user.id);

  const list = (orders || []) as Array<{
    id: string;
    merchant_id: string;
    total: number;
    status: string;
    payment_method: string | null;
    user_id: string;
  }>;

  if (list.length === 0) {
    return NextResponse.json({ error: '找不到訂單' }, { status: 404 });
  }

  const method = list[0].payment_method as MerchantPaymentMethod | null;
  if (!method || method === 'card') {
    return NextResponse.json({ error: '此訂單不適用線下付款頁' }, { status: 400 });
  }

  const merchantIds = [...new Set(list.map((o) => o.merchant_id))];
  const { data: merchants } = await supabase
    .from('merchants')
    .select(
      'id, name, payout_bank_name, payout_account_holder, payout_account_number, payout_fps_id, payout_wechat_id, payout_wechat_qr_url, payout_alipay_id, payout_alipay_qr_url'
    )
    .in('id', merchantIds);

  const merchantMap = new Map(
    (
      (merchants || []) as Array<{
        id: string;
        name: string;
        payout_bank_name: string | null;
        payout_account_holder: string | null;
        payout_account_number: string | null;
        payout_fps_id: string | null;
        payout_wechat_id: string | null;
        payout_wechat_qr_url: string | null;
        payout_alipay_id: string | null;
        payout_alipay_qr_url: string | null;
      }>
    ).map((m) => [m.id, m])
  );

  const groups = list.map((order) => {
    const m = merchantMap.get(order.merchant_id);
    const payout = payoutFromMerchant(m ?? {});
    const display = formatPayoutForDisplay(method, payout);
    return {
      orderId: order.id,
      merchantName: m?.name ?? '商家',
      total: Number(order.total),
      status: order.status,
      ...display,
    };
  });

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return NextResponse.json({
    paymentMethod: method,
    grandTotal,
    groups,
  });
}
