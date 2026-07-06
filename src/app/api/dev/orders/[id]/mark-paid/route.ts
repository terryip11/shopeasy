import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth/server';
import { markOrdersPaid } from '@/lib/orders/mark-paid';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

import { isDevOnlyRouteAllowed } from '@/lib/dev/route-guard';

/** 開發用：將待付款訂單標記為已付款（無需 Stripe webhook） */
export async function POST(_request: NextRequest, context: RouteContext) {
  if (!isDevOnlyRouteAllowed('ALLOW_DEV_MARK_PAID')) {
    return NextResponse.json({ error: '僅開發環境可用' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, merchant_id')
    .eq('id', id)
    .single();

  if (!order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const row = order as { id: string; status: string; merchant_id: string };

  if (row.status !== 'pending') {
    return NextResponse.json({ error: '僅待付款訂單可標記' }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const auth = await requireRole(['merchant', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  if (auth.role === 'merchant') {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!merchant || (merchant as { id: string }).id !== row.merchant_id) {
      return NextResponse.json({ error: '無權限操作此訂單' }, { status: 403 });
    }
  }

  const result = await markOrdersPaid([id], `dev_${Date.now()}`);

  return NextResponse.json({
    ok: true,
    ...result,
    message: '已標記為已付款（開發模式）',
  });
}
