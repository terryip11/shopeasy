import { NextResponse } from 'next/server';

/** 已改為 Stripe 月費自動升級，請使用 POST /api/merchant/tier-checkout */
export async function POST() {
  return NextResponse.json(
    { error: '升級已改為線上付款，請在儀表板點擊「升級方案」' },
    { status: 410 }
  );
}
