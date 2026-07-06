import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { merchantApplySchema, buildMerchantApplyPayload } from '@/lib/merchant/apply';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = merchantApplySchema.parse(body);
    const payload = buildMerchantApplyPayload(parsed);

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('merchants')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const status = (existing as { status: string }).status;
      if (status === 'pending') {
        return NextResponse.json({ error: '您已有待審核的申請' }, { status: 400 });
      }
      if (status === 'active') {
        return NextResponse.json({ error: '您已是商家' }, { status: 400 });
      }
      if (status === 'suspended') {
        return NextResponse.json({ error: '您的店鋪已被停用，請聯絡平台' }, { status: 400 });
      }
      if (status === 'rejected') {
        const { data, error } = await (supabase as any)
          .from('merchants')
          .update({
            ...payload,
            status: 'pending',
            applied_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
            reject_reason: null,
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
      }
    }

    const { data, error } = await (supabase as any)
      .from('merchants')
      .insert({
        user_id: user.id,
        ...payload,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '店鋪網址代稱已被使用' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('merchants')
    .select(
      'id, name, slug, status, applied_at, reject_reason, contact_name, contact_phone, contact_email, company_address'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data);
}
