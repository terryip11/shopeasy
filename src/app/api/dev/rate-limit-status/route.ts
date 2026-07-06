import { NextResponse } from 'next/server';
import { isDevOnlyRouteAllowed } from '@/lib/dev/route-guard';
import { isRedisRateLimitEnabled, rateLimit } from '@/lib/rate-limit';

/** 開發用：確認 Upstash 限流是否已啟用 */
export async function GET() {
  if (!isDevOnlyRouteAllowed('ALLOW_DEV_MARK_PAID')) {
    return NextResponse.json({ error: '僅開發環境可用' }, { status: 403 });
  }

  const redisEnabled = isRedisRateLimitEnabled();
  const probe = await rateLimit(`dev-probe:${Date.now()}`, 100, 60_000);

  return NextResponse.json({
    redisEnabled,
    probeOk: probe.ok,
    hint: redisEnabled
      ? 'Upstash 已連線；請到 Data Browser 搜尋 shopeasy:rl'
      : '未讀到 UPSTASH_REDIS_*，目前使用記憶體限流',
  });
}
