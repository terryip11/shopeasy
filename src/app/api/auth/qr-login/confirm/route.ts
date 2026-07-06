import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isQrLoginRole } from '@/lib/auth/qr-login';
import { confirmQrLoginPoll } from '@/lib/auth/qr-login-poll';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  pollId: z.string().uuid('無效的掃碼登入請求'),
});

/** 手機掃碼登入成功後，通知電腦端可同步登入 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`qr-login-confirm:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: '請求過於頻繁' }, { status: 429 });
  }

  try {
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const role = await getUserRole();
    if (!isQrLoginRole(role)) {
      return NextResponse.json({ error: '掃碼登入僅限管理員使用' }, { status: 403 });
    }

    const { pollId } = bodySchema.parse(await request.json());
    await confirmQrLoginPoll(pollId, user.id, user.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const code = (error as Error).message;
    if (code === 'POLL_NOT_FOUND') {
      return NextResponse.json({ error: '掃碼請求不存在' }, { status: 404 });
    }
    if (code === 'EMAIL_MISMATCH') {
      return NextResponse.json({ error: '帳號與掃碼信箱不符' }, { status: 403 });
    }
    if (code === 'POLL_EXPIRED' || code === 'POLL_NOT_PENDING') {
      return NextResponse.json({ error: '掃碼已過期，請在電腦重新產生' }, { status: 410 });
    }
    console.error('[qr-login/confirm]', error);
    return NextResponse.json({ error: '無法確認掃碼登入' }, { status: 500 });
  }
}
