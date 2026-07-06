import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth/server';
import { getCourierProfile, getDeliveryZones } from '@/lib/courier/server';
import { createClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  is_online: z.boolean().optional(),
  zone_ids: z.array(z.string().uuid()).min(1, '請至少選擇一個配送區域').optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const profile = await getCourierProfile(user.id);
  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: '配送員帳號未啟用' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const supabase = await createClient();

    if (body.zone_ids) {
      const zones = await getDeliveryZones();
      const validIds = new Set(zones.map((z) => z.id));
      const invalid = body.zone_ids.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json({ error: '包含無效的配送區域' }, { status: 400 });
      }
    }

    const { data, error } = await (supabase as any)
      .from('courier_profiles')
      .update(body)
      .eq('user_id', user.id)
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
