import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import {
  LANDING_VARIANTS,
  getLandingVariant,
  setLandingVariant,
} from '@/lib/marketing/landing-theme';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const patchSchema = z.object({
  variant: z.enum(LANDING_VARIANTS),
});

export async function GET() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }

  try {
    const variant = await getLandingVariant();
    return NextResponse.json({ variant });
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
    const result = await setLandingVariant(body.variant, user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(
      user.id,
      'platform.landing_variant.update',
      'platform_settings',
      'landing_page_variant',
      { variant: result.variant }
    );

    return NextResponse.json({ variant: result.variant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
