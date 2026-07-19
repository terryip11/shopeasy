import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import {
  getPlatformPayoutSettings,
  setPlatformPayoutSettings,
} from '@/lib/finance/platform-payout';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const patchSchema = z.object({
  accountHolder: z.string().min(2, '請填寫 FPS 收款人姓名'),
  fpsId: z.string().min(4, '請填寫轉數快 FPS 識別碼'),
  instructions: z.string().max(500).optional(),
});

export async function GET() {
  const role = await getUserRole();
  if (!canManageFinance(role)) {
    return NextResponse.json({ error: '僅財務管理員可查看' }, { status: 403 });
  }

  try {
    const settings = await getPlatformPayoutSettings();
    return NextResponse.json({
      settings,
      configured: Boolean(settings.accountHolder && settings.fpsId),
      canEdit: isSuperAdmin(role),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  const role = await getUserRole();
  if (!user || !isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可修改平台收款設定' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const result = await setPlatformPayoutSettings(
      {
        accountHolder: body.accountHolder,
        fpsId: body.fpsId,
        instructions: body.instructions ?? '',
      },
      user.id
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(
      user.id,
      'platform.payout.update',
      'platform_settings',
      'platform_payout_fps',
      { fpsId: result.settings.fpsId }
    );

    return NextResponse.json({ settings: result.settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
