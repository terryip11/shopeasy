import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser, getAuthUser } from '@/lib/auth/server';
import {
  markCourierEarningPaid,
  markPromoterEarningPaid,
} from '@/lib/merchant/payables';

const bodySchema = z.object({
  type: z.enum(['promoter', 'courier']),
  earningId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  const merchant = await getActiveMerchantForUser();
  if (!user || !merchant) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result =
      body.type === 'promoter'
        ? await markPromoterEarningPaid({
            merchantId: merchant.id,
            earningId: body.earningId,
            merchantUserId: user.id,
            note: body.note,
          })
        : await markCourierEarningPaid({
            merchantId: merchant.id,
            earningId: body.earningId,
            merchantUserId: user.id,
            note: body.note,
          });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || '操作失敗' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
