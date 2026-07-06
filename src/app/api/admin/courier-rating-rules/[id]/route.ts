import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { deleteRatingSurchargeRule } from '@/lib/admin/courier-rating-rules';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await deleteRatingSurchargeRule(id, auth.user.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
