import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getDeliveryJobForOrder } from '@/lib/orders/server';
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

  if (row.status === 'completed') {
    return NextResponse.json({ error: '訂單已完成，無法申請退款' }, { status: 400 });
  }

  if (row.status !== 'paid' && row.status !== 'shipped') {
    return NextResponse.json({ error: '僅已付款或已發貨訂單可申請退款' }, { status: 400 });
  }

  const deliveryJob = await getDeliveryJobForOrder(id);
  if (deliveryJob?.status === 'delivered') {
    return NextResponse.json({ error: '商品已送達，無法再申請退款' }, { status: 400 });
  }

  const { data, error: updateError } = await (supabase as any)
    .from('orders')
    .update({ status: 'refund_requested' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
