import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getTierLimits, setTierLimits } from '@/lib/merchant/tier-limits';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const tierLimitSchema = z.object({
  maxProducts: z.number().int().min(1).max(9999),
  maxImagesPerProduct: z.number().int().min(1).max(50),
});

const patchSchema = z.object({
  basic: tierLimitSchema,
  premium: tierLimitSchema,
  vip: tierLimitSchema,
});

export async function GET() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }

  try {
    const limits = await getTierLimits();
    return NextResponse.json(limits);
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
    const body = patchSchema.parse(await request.json());
    const result = await setTierLimits(body, user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(
      user.id,
      'platform.merchant_tier_limits.update',
      'platform_settings',
      'merchant_tier_limits',
      result.limits
    );

    return NextResponse.json(result.limits);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
