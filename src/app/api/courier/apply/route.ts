import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const applySchema = z.object({
  phone: z.string().min(8, '請輸入有效電話'),
  vehicle_type: z.enum(['walk', 'bicycle', 'motorcycle', 'van']),
  preferred_job_type: z.enum(['food', 'parcel']),
  zone_ids: z.array(z.string().uuid()).min(1, '請至少選擇一個配送區域'),
  hkid_image_url: z.string().url('請上傳香港身份證'),
  declaration_accepted: z.literal(true, { message: '請閱讀並同意入駐聲明' }),
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const limited = await rateLimit(`courier-apply:${user.id}`, 3, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `申請過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
      { status: 429 }
    );
  }

  try {
    const body = applySchema.parse(await request.json());
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('courier_profiles')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const status = (existing as { status: string }).status;
      if (status === 'pending') {
        return NextResponse.json({ error: '您已有審核中的申請' }, { status: 400 });
      }
      if (status === 'active') {
        return NextResponse.json({ error: '您已是配送員' }, { status: 400 });
      }
      if (status === 'suspended') {
        return NextResponse.json({ error: '帳號已停用，請聯絡客服' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from('courier_profiles')
      .upsert(
        {
          user_id: user.id,
          phone: body.phone,
          vehicle_type: body.vehicle_type,
          preferred_job_type: body.preferred_job_type,
          zone_ids: body.zone_ids,
          hkid_image_url: body.hkid_image_url,
          declaration_accepted_at: now,
          status: 'pending',
          is_online: false,
          applied_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
