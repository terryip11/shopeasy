import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  score: z.number().int().min(1).max(5),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const { id: orderId } = await context.params;

  try {
    const { score } = bodySchema.parse(await request.json());
    const supabase = await createClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
    }

    const { data: job } = await supabase
      .from('delivery_jobs')
      .select('id, status, courier_id')
      .eq('order_id', orderId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const jobRow = job as { courier_id: string | null; status: string } | null;
    if (!jobRow?.courier_id) {
      return NextResponse.json({ error: '訂單尚未完成配送，無法評分' }, { status: 400 });
    }

    const { error: insertError } = await (supabase as any).from('courier_ratings').insert({
      order_id: orderId,
      buyer_id: user.id,
      courier_id: jobRow.courier_id,
      score,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: '此訂單已評分' }, { status: 409 });
      }
      if (insertError.message?.includes('courier_ratings')) {
        return NextResponse.json(
          {
            error:
              '資料庫尚未建立配送員評分表，請執行 supabase/migrate-v23-shipping-buyer-rating.sql 或 migrate-v24-courier-customer-ratings.sql',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
