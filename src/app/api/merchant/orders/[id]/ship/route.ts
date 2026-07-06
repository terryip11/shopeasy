import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, getMerchantForUser } from '@/lib/auth/server';
import { notifyOrderShipped } from '@/lib/push/notify-order';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };
type Order = Database['public']['Tables']['orders']['Row'];

const shipSchema = z.object({
  tracking_number: z.string().min(1, '請輸入物流追蹤號').max(100),
});

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

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await getMerchantOrder(id);
  if (result.error) return result.error;

  const order = result.order!;

  if (order.status !== 'paid') {
    return NextResponse.json(
      { error: '僅已付款訂單可標記為已發貨' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { tracking_number } = shipSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('orders')
      .update({ status: 'shipped', tracking_number })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    void notifyOrderShipped(id, tracking_number);

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
