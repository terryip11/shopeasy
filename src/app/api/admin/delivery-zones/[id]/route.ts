import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import { deleteDeliveryZone, updateDeliveryZone } from '@/lib/admin/couriers';
import { logAdminAction } from '@/lib/admin/merchant-actions';

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  region: z.enum(['港島', '九龍', '新界']).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = updateSchema.parse(await request.json());
  const result = await updateDeliveryZone(id, body);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.user.id, 'delivery_zone.update', 'delivery_zones', id, body);

  return NextResponse.json({ zone: result.zone });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await deleteDeliveryZone(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.user.id, 'delivery_zone.delete', 'delivery_zones', id, {});

  return NextResponse.json({ ok: true });
}
