import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/lib/admin/merchant-actions';
import type { UserCapability } from '@/lib/auth/capabilities';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  capability: z.enum(['food_courier', 'parcel_courier']),
  action: z.enum(['grant', 'revoke']),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('users:manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅全權管理員可修改配送能力' }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = bodySchema.parse(await request.json());
    const supabase = createAdminClient();

    if (body.action === 'grant') {
      const { error } = await (supabase as any)
        .from('user_capabilities')
        .upsert(
          {
            user_id: id,
            capability: body.capability,
            granted_by: auth.user!.id,
          },
          { onConflict: 'user_id,capability' }
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await (supabase as any)
        .from('courier_profiles')
        .upsert(
          {
            user_id: id,
            status: 'active',
            is_online: false,
          },
          { onConflict: 'user_id' }
        );

      await logAdminAction(auth.user!.id, 'user.capability_grant', 'user_capabilities', id, {
        capability: body.capability,
      });
    } else {
      const { error } = await supabase
        .from('user_capabilities')
        .delete()
        .eq('user_id', id)
        .eq('capability', body.capability as UserCapability);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data: remaining } = await supabase
        .from('user_capabilities')
        .select('capability')
        .eq('user_id', id);

      if (!remaining?.length) {
        await (supabase as any)
          .from('courier_profiles')
          .update({ status: 'suspended', is_online: false })
          .eq('user_id', id);
      }

      await logAdminAction(auth.user!.id, 'user.capability_revoke', 'user_capabilities', id, {
        capability: body.capability,
      });
    }

    const { data: capabilities } = await supabase
      .from('user_capabilities')
      .select('capability')
      .eq('user_id', id);

    return NextResponse.json({
      capabilities: (capabilities || []).map((c) => (c as { capability: string }).capability),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
