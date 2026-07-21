import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { createUnpaidReport } from '@/lib/merchant/payout-compliance';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';

const bodySchema = z.object({
  earningType: z.enum(['promoter', 'courier']),
  earningId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  const role = await getUserRole();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  if (!(await isMerchantDirectPayout())) {
    return NextResponse.json({ error: '目前非商家直付模式' }, { status: 400 });
  }

  try {
    const body = bodySchema.parse(await request.json());

    let reporterRole: 'promoter' | 'courier';
    if (body.earningType === 'promoter') {
      if (role !== 'promoter' && role !== 'super_admin') {
        return NextResponse.json({ error: '僅分享員可回報' }, { status: 403 });
      }
      reporterRole = 'promoter';
    } else {
      // 配送員角色存在 courier_profiles，profile.role 可能仍是 buyer
      reporterRole = 'courier';
    }

    const result = await createUnpaidReport({
      reporterRole,
      reporterId: user.id,
      earningType: body.earningType,
      earningId: body.earningId,
      note: body.note,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || '回報失敗' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
