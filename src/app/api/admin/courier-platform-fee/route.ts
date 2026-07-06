import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import {
  getCourierPlatformFeeRate,
  setCourierPlatformFeeRate,
} from '@/lib/finance/platform-settings';
import { syncPendingCourierEarnings } from '@/lib/finance/courier-earnings';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const patchSchema = z.object({
  rate: z.number().min(0).max(1),
});

export async function GET() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }

  try {
    const rate = await getCourierPlatformFeeRate();
    return NextResponse.json({ rate, ratePercent: Math.round(rate * 1000) / 10 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  const role = await getUserRole();
  if (!user || !isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可調整' }, { status: 403 });
  }

  try {
    const { rate } = patchSchema.parse(await request.json());
    const result = await setCourierPlatformFeeRate(rate, user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await syncPendingCourierEarnings({ rate: result.rate });

    await logAdminAction(
      user.id,
      'platform.courier_fee_rate.update',
      'platform_settings',
      'courier_platform_fee_rate',
      { rate }
    );

    return NextResponse.json({
      rate: result.rate,
      ratePercent: Math.round(result.rate * 1000) / 10,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
