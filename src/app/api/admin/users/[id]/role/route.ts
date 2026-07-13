import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/lib/admin/merchant-actions';

type RouteContext = { params: Promise<{ id: string }> };

const roleSchema = z.object({
  role: z.enum(['buyer', 'merchant', 'admin', 'accountant', 'super_admin', 'promoter']),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('users:manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅全權管理員可修改角色' }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === auth.user!.id) {
    return NextResponse.json({ error: '不能修改自己的角色' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { role } = roleSchema.parse(body);

    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.user!.id, 'user.role_change', 'profiles', id, { role });

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
