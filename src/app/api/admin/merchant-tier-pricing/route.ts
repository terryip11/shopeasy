import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import {
  getTierMonthlyPrices,
  setTierMonthlyPrices,
} from '@/lib/merchant/tier-pricing';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const patchSchema = z.object({
  premium: z.number().min(1).max(99999),
  vip: z.number().min(1).max(99999),
});

export async function GET() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: '僅全權管理員可查看' }, { status: 403 });
  }

  try {
    const prices = await getTierMonthlyPrices();
    return NextResponse.json(prices);
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
    const result = await setTierMonthlyPrices(body, user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(
      user.id,
      'platform.merchant_tier_pricing.update',
      'platform_settings',
      'merchant_tier_monthly_prices',
      result.prices
    );

    return NextResponse.json(result.prices);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
