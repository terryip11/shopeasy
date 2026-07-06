import { NextRequest, NextResponse } from 'next/server';
import { claimDeliveryJob } from '@/lib/courier/server';
import { snapshotJobCourierPayout } from '@/lib/delivery/courier-payout';
import { mapClaimError } from '@/lib/courier/types';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAuthUser } from '@/lib/auth/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  const ip = getClientIp(_request);
  const key = user ? `claim:${user.id}` : `claim:ip:${ip}`;
  const limited = await rateLimit(key, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `搶單過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
      { status: 429 }
    );
  }

  const { id } = await context.params;
  const { data, error } = await claimDeliveryJob(id);

  if (error) {
    const msg = mapClaimError(error.message);
    const status = error.message === 'UNAUTHORIZED' ? 401 : 409;
    return NextResponse.json({ error: msg }, { status });
  }

  if (data) {
    await snapshotJobCourierPayout(id);
  }

  return NextResponse.json(data);
}
