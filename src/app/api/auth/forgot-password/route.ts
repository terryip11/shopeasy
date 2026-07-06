import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email('請輸入有效電子郵件'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await rateLimit(`forgot-password:${ip}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `請求過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
      { status: 429 }
    );
  }

  try {
    const { email } = bodySchema.parse(await request.json());
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${base}/auth/callback?next=/auth/update-password`;

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // 不透露信箱是否存在
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
