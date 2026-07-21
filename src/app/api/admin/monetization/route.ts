import { NextResponse } from 'next/server';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import {
  ensureLockedMonetizationSettings,
  getPlatformMonetizationSettings,
} from '@/lib/finance/monetization';
import { logAdminAction } from '@/lib/admin/merchant-actions';

export async function GET() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }
  try {
    const settings = await getPlatformMonetizationSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/** 強制同步為訂閱為主 + 商家直付（不再接受切換舊模式） */
export async function PATCH() {
  const user = await getAuthUser();
  const role = await getUserRole();
  if (!user || !isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可調整' }, { status: 403 });
  }

  try {
    const result = await ensureLockedMonetizationSettings(user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.updated) {
      await logAdminAction(
        user.id,
        'platform.monetization.lock',
        'platform_settings',
        'monetization',
        result.settings
      );
    }

    return NextResponse.json({
      settings: result.settings,
      updated: result.updated,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
