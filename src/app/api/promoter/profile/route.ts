import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/server';
import { validatePromoterFpsPayout } from '@/lib/promoter/payout';
import { getPromoterProfileForUser, upsertPromoterProfile } from '@/lib/promoter/server';

const patchSchema = z.object({
  payout_account_holder: z.string().min(2, '請填寫 FPS 收款人姓名'),
  payout_fps_id: z.string().min(4, '請填寫轉數快 FPS 識別碼'),
});

export async function GET() {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const payout = await getPromoterProfileForUser(auth.user!.id);
  if (!payout) {
    return NextResponse.json({ error: '尚未登記 FPS 收款資料' }, { status: 404 });
  }

  return NextResponse.json({
    payoutAccountHolder: payout.accountHolder,
    payoutFpsId: payout.fpsId,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const payout = {
      accountHolder: body.payout_account_holder,
      fpsId: body.payout_fps_id,
    };
    const payoutError = validatePromoterFpsPayout(payout);
    if (payoutError) {
      return NextResponse.json({ error: payoutError }, { status: 400 });
    }

    const result = await upsertPromoterProfile(auth.user!.id, payout);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      payoutAccountHolder: payout.accountHolder,
      payoutFpsId: payout.fpsId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
