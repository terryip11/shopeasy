import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import {
  adminAdjustPlatformCredit,
  listMerchantsCreditAdmin,
  listPendingTopupRequestsAdmin,
  reviewTopupRequest,
} from '@/lib/finance/platform-credit';

export async function GET() {
  const role = await getUserRole();
  if (!canManageFinance(role)) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const [merchants, pendingTopups] = await Promise.all([
    listMerchantsCreditAdmin(),
    listPendingTopupRequestsAdmin(),
  ]);

  return NextResponse.json({ merchants, pendingTopups });
}

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('topup'),
    merchant_id: z.string().uuid(),
    amount: z.number().positive().max(100000),
    note: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal('adjust'),
    merchant_id: z.string().uuid(),
    amount: z.number().refine((n) => n !== 0, '金額不可為 0').max(100000),
    note: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal('review_topup'),
    request_id: z.string().uuid(),
    approve: z.boolean(),
    admin_note: z.string().max(300).optional(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const role = await getUserRole();
    if (!canManageFinance(role)) {
      return NextResponse.json({ error: '無權限' }, { status: 403 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const body = bodySchema.parse(await request.json());

    if (body.action === 'review_topup') {
      const result = await reviewTopupRequest({
        requestId: body.request_id,
        approve: body.approve,
        adminId: user.id,
        adminNote: body.admin_note,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, balance: result.balance });
    }

    // 直接調帳：super_admin / admin
    if (!isSuperAdmin(role) && role !== 'admin') {
      return NextResponse.json({ error: '僅管理員可直接調帳' }, { status: 403 });
    }

    const result = await adminAdjustPlatformCredit({
      merchantId: body.merchant_id,
      amount: body.amount,
      note: body.note,
      adminId: user.id,
      entryType: body.action === 'topup' ? 'topup' : 'adjust',
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
