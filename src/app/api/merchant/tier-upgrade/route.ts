import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getActiveMerchantForUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUpgradeOptions, type MerchantTier } from '@/lib/merchant/tier-config';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import {
  getPlatformPayoutSettings,
  isPlatformPayoutConfigured,
} from '@/lib/finance/platform-payout';

const bodySchema = z.object({
  requested_tier: z.enum(['premium', 'vip']),
  note: z.string().max(500).optional().nullable(),
});

/** 半自動 FPS：商家回報已付款，等待管理員確認後開通 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  if (isStripePaymentsEnabled()) {
    return NextResponse.json(
      { error: '目前已開放線上信用卡訂閱，請在儀表板使用「前往付款」' },
      { status: 400 }
    );
  }

  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '找不到有效店鋪' }, { status: 403 });
  }

  const platformPayout = await getPlatformPayoutSettings();
  if (!isPlatformPayoutConfigured(platformPayout)) {
    return NextResponse.json(
      { error: '平台尚未設定 FPS 收款資料，請稍後再試或聯絡客服' },
      { status: 503 }
    );
  }

  try {
    const body = bodySchema.parse(await request.json());
    const currentTier = ((merchant.tier as MerchantTier) || 'basic') as MerchantTier;

    if (!getUpgradeOptions(currentTier).includes(body.requested_tier)) {
      return NextResponse.json({ error: '無法升級至所選方案' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('merchant_tier_upgrades')
      .select('id')
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '你已有待確認的升級申請，請等候管理員核對 FPS 轉帳' },
        { status: 409 }
      );
    }

    const note = body.note?.trim() || null;
    const { data, error } = await (supabase as any)
      .from('merchant_tier_upgrades')
      .insert({
        merchant_id: merchant.id,
        user_id: user.id,
        current_tier: currentTier,
        requested_tier: body.requested_tier,
        status: 'pending',
        note,
      })
      .select('id, requested_tier, applied_at, note')
      .single();

    if (error) {
      if (error.message?.includes('merchant_tier_upgrades')) {
        return NextResponse.json(
          { error: '請執行 supabase/migrate-v7-merchant-tier.sql' },
          { status: 500 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '你已有待確認的升級申請，請等候管理員核對 FPS 轉帳' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      upgrade: data,
      message: '已提交，管理員核對轉帳後將開通等級',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
