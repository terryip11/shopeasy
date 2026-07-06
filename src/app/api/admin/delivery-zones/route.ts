import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import {
  createDeliveryZone,
  getAdminDeliveryZones,
} from '@/lib/admin/couriers';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const createSchema = z.object({
  name: z.string().min(1, '請填寫名稱'),
  slug: z
    .string()
    .min(1, '請填寫 slug')
    .regex(/^[a-z0-9-]+$/, 'slug 僅限小寫英文、數字與連字號'),
  region: z.enum(['港島', '九龍', '新界']),
});

export async function GET() {
  const auth = await requirePermission('couriers:read');
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const zones = await getAdminDeliveryZones();
  return NextResponse.json({ zones });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const body = createSchema.parse(await request.json());
  const result = await createDeliveryZone(body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.user.id, 'delivery_zone.create', 'delivery_zones', result.zone!.id, {
    name: body.name,
    region: body.region,
  });

  return NextResponse.json({ zone: result.zone });
}
