import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getActiveMerchantForUser } from '@/lib/auth/server';
import {
  fulfillMerchantTierFromCheckoutSession,
  syncMerchantTierFromStripe,
} from '@/lib/merchant/subscription';

const bodySchema = z.object({
  session_id: z.string().min(1).optional(),
  sync: z.boolean().optional(),
});

/** 付款回跳或手動同步：確認 Stripe 付款並升級等級 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  const merchant = await getActiveMerchantForUser();

  if (!user || !merchant) {
    return NextResponse.json({ error: '請先登入並通過商家審核' }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const result = body.sync
      ? await syncMerchantTierFromStripe(merchant.id, user.id)
      : body.session_id
        ? await fulfillMerchantTierFromCheckoutSession(body.session_id, user.id)
        : null;

    if (!result) {
      return NextResponse.json({ error: '請提供 session_id 或使用 sync' }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      tier: result.tier,
      alreadyActive: result.alreadyActive,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error('Tier confirm error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
