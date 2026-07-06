import { NextRequest, NextResponse } from 'next/server';
import { getQrLoginPollStatus } from '@/lib/auth/qr-login-poll';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/** 電腦端輪詢：手機是否已完成掃碼登入 */
export async function GET(request: NextRequest) {
  const pollId = request.nextUrl.searchParams.get('pollId');
  if (!pollId) {
    return NextResponse.json({ error: '缺少 pollId' }, { status: 400 });
  }

  const ip = getClientIp(request);
  const limited = await rateLimit(`qr-login-poll:${ip}`, 120, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: '請求過於頻繁' }, { status: 429 });
  }

  try {
    const status = await getQrLoginPollStatus(pollId);
    return NextResponse.json({ status });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'POLL_NOT_FOUND') {
      return NextResponse.json({ error: '掃碼請求不存在' }, { status: 404 });
    }
    console.error('[qr-login/poll]', error);
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
  }
}
