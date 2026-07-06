import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { claimBuyerPayment } from '@/lib/orders/claim-payment';

const bodySchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, '請提供訂單編號'),
});

/** 買家回報已完成線下付款 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  try {
    const { orderIds } = bodySchema.parse(await request.json());
    const result = await claimBuyerPayment(orderIds, user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const code = (error as Error).message;
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ error: '找不到訂單' }, { status: 404 });
    }
    if (code === 'NOT_PENDING') {
      return NextResponse.json({ error: '僅待付款訂單可回報' }, { status: 400 });
    }
    if (code === 'NOT_MANUAL') {
      return NextResponse.json({ error: '此訂單不適用線下付款回報' }, { status: 400 });
    }
    const msg = (error as { message?: string }).message || '';
    if (msg.includes('buyer_payment_claimed_at')) {
      return NextResponse.json(
        {
          error:
            '資料庫尚未加入 buyer_payment_claimed_at 欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v34-buyer-payment-claimed.sql',
        },
        { status: 500 }
      );
    }
    console.error('[orders/claim-payment]', error);
    return NextResponse.json({ error: '無法回報付款' }, { status: 500 });
  }
}
