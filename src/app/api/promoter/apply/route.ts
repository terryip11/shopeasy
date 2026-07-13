import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getProfile } from '@/lib/auth/server';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSelfRegisterAsPromoter } from '@/lib/promoter/apply';
import { validatePromoterFpsPayout } from '@/lib/promoter/payout';
import { upsertPromoterProfile } from '@/lib/promoter/server';
import { rateLimit } from '@/lib/rate-limit';

const applySchema = z.object({
  terms_accepted: z.literal(true, { message: '請閱讀並同意分享員計劃條款' }),
  payout_account_holder: z.string().min(2, '請填寫 FPS 收款人姓名'),
  payout_fps_id: z.string().min(4, '請填寫轉數快 FPS 識別碼'),
});
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const [profile, platform] = await Promise.all([getProfile(), getAffiliatePlatformSettings()]);
  const role = profile?.role ?? 'buyer';

  if (role === 'promoter') {
    return NextResponse.json({
      status: 'active',
      canApply: false,
      message: '您已是分享員',
    });
  }

  if (!platform.enabled) {
    return NextResponse.json({
      status: 'disabled',
      canApply: false,
      message: '分享推廣計劃暫未開放',
    });
  }

  if (!canSelfRegisterAsPromoter(role)) {
    return NextResponse.json({
      status: 'ineligible',
      canApply: false,
      message: '目前身分無法登記為分享員，請使用買家帳號或聯絡平台',
    });
  }

  return NextResponse.json({
    status: 'eligible',
    canApply: true,
    platform,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const limited = await rateLimit(`promoter-apply:${user.id}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: '操作過於頻繁，請稍後再試' }, { status: 429 });
  }

  try {
    const body = applySchema.parse(await request.json());
    if (!body.terms_accepted) {
      return NextResponse.json({ error: '請閱讀並同意分享員計劃條款' }, { status: 400 });
    }

    const [profile, platform] = await Promise.all([getProfile(), getAffiliatePlatformSettings()]);
    const role = profile?.role ?? 'buyer';

    if (role === 'promoter') {
      return NextResponse.json({ ok: true, alreadyPromoter: true });
    }

    if (!platform.enabled) {
      return NextResponse.json({ error: '分享推廣計劃暫未開放' }, { status: 403 });
    }

    if (!canSelfRegisterAsPromoter(role)) {
      return NextResponse.json({ error: '目前身分無法登記為分享員' }, { status: 403 });
    }

    const payout = {
      accountHolder: body.payout_account_holder,
      fpsId: body.payout_fps_id,
    };
    const payoutError = validatePromoterFpsPayout(payout);
    if (payoutError) {
      return NextResponse.json({ error: payoutError }, { status: 400 });
    }

    const profileResult = await upsertPromoterProfile(user.id, payout);
    if (profileResult.error) {
      return NextResponse.json({ error: profileResult.error }, { status: 500 });
    }

    const supabase = createAdminClient();    const { error } = await (supabase as any)
      .from('profiles')
      .update({ role: 'promoter' })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
