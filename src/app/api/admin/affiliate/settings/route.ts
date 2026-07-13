import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import {
  getAffiliatePlatformSettings,
  setAffiliatePlatformSettings,
} from '@/lib/affiliate/settings';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  platformCutRate: z.number().min(0).max(1).optional(),
  attributionDays: z.number().int().min(1).max(365).optional(),
  minCommissionRate: z.number().min(0).max(1).optional(),
  maxCommissionRate: z.number().min(0).max(1).optional(),
});

export async function GET() {
  const auth = await requirePermission('users:manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }

  const settings = await getAffiliatePlatformSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('users:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '僅全權管理員可修改' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const result = await setAffiliatePlatformSettings(
      {
        enabled: body.enabled,
        platformCutRate: body.platformCutRate,
        attributionDays: body.attributionDays,
        minCommissionRate: body.minCommissionRate,
        maxCommissionRate: body.maxCommissionRate,
      },
      auth.user.id
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ settings: result.settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
