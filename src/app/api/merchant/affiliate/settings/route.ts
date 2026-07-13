import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clampCommissionRate, getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import { getPlatformFeeRate } from '@/lib/finance/config';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  default_commission_rate: z.number().min(0).max(1).optional(),
});

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('merchant_affiliate_settings')
    .select('enabled, default_commission_rate')
    .eq('merchant_id', merchant.id)
    .maybeSingle();

  const platform = await getAffiliatePlatformSettings();

  return NextResponse.json({
    enabled: Boolean((data as { enabled?: boolean } | null)?.enabled),
    defaultCommissionRate: Number(
      (data as { default_commission_rate?: number } | null)?.default_commission_rate ?? 0.1
    ),
    platform,
    platformFeeRate: getPlatformFeeRate(merchant.tier),
    stripePaymentsEnabled: isStripePaymentsEnabled(),
  });
}

export async function PATCH(request: NextRequest) {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const platform = await getAffiliatePlatformSettings();

    const patch: Record<string, unknown> = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
    };

    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.default_commission_rate !== undefined) {
      patch.default_commission_rate = clampCommissionRate(
        body.default_commission_rate,
        platform
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from('merchant_affiliate_settings')
      .upsert(patch, { onConflict: 'merchant_id' })
      .select('enabled, default_commission_rate')
      .single();

    if (error) {
      if (error.message?.includes('merchant_affiliate_settings')) {
        return NextResponse.json({
          error: '請執行 supabase/migrate-v42-affiliate.sql',
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      enabled: data.enabled,
      defaultCommissionRate: Number(data.default_commission_rate),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
