import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createQrLoginUrl, isQrLoginEnabled } from '@/lib/auth/qr-login';

const bodySchema = z.object({
  email: z.string().email('請輸入有效的電子郵件'),
  redirectOrigin: z.string().url('請輸入有效的手機跳轉網址').optional(),
});

/** 產生掃碼登入連結（僅 admin / super_admin；設 QR_LOGIN_ENABLED=false 可關閉） */
export async function POST(request: NextRequest) {
  if (!isQrLoginEnabled()) {
    return NextResponse.json({ error: '掃碼登入未啟用' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limited = await rateLimit(`qr-login:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `請求過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
      { status: 429 }
    );
  }

  try {
    const { email, redirectOrigin } = bodySchema.parse(await request.json());
    const emailLimited = await rateLimit(`qr-login:email:${email.toLowerCase()}`, 5, 60_000);
    if (!emailLimited.ok) {
      return NextResponse.json(
        { error: `此信箱請求過於頻繁，請 ${emailLimited.retryAfterSec} 秒後再試` },
        { status: 429 }
      );
    }

    const { loginUrl, pollId } = await createQrLoginUrl(email, { redirectOrigin });
    return NextResponse.json({ loginUrl, pollId, expiresInSec: 300 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const code = (error as Error).message;
    if (code === 'INVALID_ORIGIN') {
      return NextResponse.json({ error: '手機跳轉網址格式不正確' }, { status: 400 });
    }
    if (code === 'ORIGIN_NOT_ALLOWED') {
      return NextResponse.json({ error: '手機跳轉網址不被允許' }, { status: 400 });
    }
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ error: '找不到此帳號' }, { status: 404 });
    }
    if (code === 'FORBIDDEN') {
      return NextResponse.json({ error: '掃碼登入僅限管理員使用' }, { status: 403 });
    }
    console.error('[qr-login]', error);
    return NextResponse.json({ error: '無法產生登入碼，請稍後再試' }, { status: 500 });
  }
}
