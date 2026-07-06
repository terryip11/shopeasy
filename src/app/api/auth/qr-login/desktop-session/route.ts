import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeQrLoginPollForDesktop } from '@/lib/auth/qr-login-poll';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  pollId: z.string().uuid('無效的掃碼登入請求'),
});

/** 手機確認後，電腦端兌換一次性 session */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`qr-login-desktop:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: '請求過於頻繁' }, { status: 429 });
  }

  try {
    const { pollId } = bodySchema.parse(await request.json());
    const session = await consumeQrLoginPollForDesktop(pollId);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const code = (error as Error).message;
    if (code === 'POLL_NOT_FOUND') {
      return NextResponse.json({ error: '掃碼請求不存在' }, { status: 404 });
    }
    if (code === 'POLL_NOT_CONFIRMED') {
      return NextResponse.json({ error: '尚未完成手機確認' }, { status: 409 });
    }
    if (code === 'POLL_EXPIRED' || code === 'POLL_CONSUMED') {
      return NextResponse.json({ error: '掃碼已過期或已使用' }, { status: 410 });
    }
    console.error('[qr-login/desktop-session]', error);
    return NextResponse.json({ error: '無法同步電腦登入' }, { status: 500 });
  }
}
