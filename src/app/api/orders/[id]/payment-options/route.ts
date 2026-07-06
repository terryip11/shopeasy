import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMerchantPaymentOptions } from '@/lib/checkout/payment-options';
import type { Database } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

/** 待付款訂單可選的付款方式 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, merchant_id, payment_method')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const row = order as Pick<
    Database['public']['Tables']['orders']['Row'],
    'id' | 'status' | 'merchant_id' | 'payment_method'
  >;

  if (row.status !== 'pending') {
    return NextResponse.json({ error: '此訂單不是待付款狀態' }, { status: 400 });
  }

  if (!row.merchant_id) {
    return NextResponse.json({ error: '訂單缺少商家資訊' }, { status: 400 });
  }

  const { options } = await resolveMerchantPaymentOptions(row.merchant_id);

  return NextResponse.json({
    methods: options,
    currentPaymentMethod: row.payment_method,
  });
}
