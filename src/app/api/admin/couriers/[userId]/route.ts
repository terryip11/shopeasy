import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import { approveCourierApplication, rejectCourierApplication } from '@/lib/delivery/jobs';
import { updateAdminCourier } from '@/lib/admin/couriers';
import { logAdminAction } from '@/lib/admin/merchant-actions';
import type { DeliveryJobType } from '@/types/database';

type RouteContext = { params: Promise<{ userId: string }> };

const approveSchema = z.object({
  job_types: z.array(z.enum(['food', 'parcel'])).min(1),
});

const rejectSchema = z.object({
  reason: z.string().min(1, '請填寫拒絕原因'),
});

const patchSchema = z.object({
  zone_ids: z.array(z.string().uuid()).min(1).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  job_types: z.array(z.enum(['food', 'parcel'])).min(1).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = patchSchema.parse(await request.json());

  const result = await updateAdminCourier(userId, auth.user.id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.user.id, 'courier.update', 'courier_profiles', userId, body);

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { userId } = await context.params;
  const action = new URL(request.url).searchParams.get('action');

  if (action === 'reject') {
    const body = rejectSchema.parse(await request.json());
    const result = await rejectCourierApplication(userId, auth.user.id, body.reason);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await logAdminAction(auth.user.id, 'courier.reject', 'courier_profiles', userId, {
      reason: body.reason,
    });
    return NextResponse.json({ ok: true });
  }

  const body = approveSchema.parse(await request.json());
  const result = await approveCourierApplication(
    userId,
    auth.user.id,
    body.job_types as DeliveryJobType[]
  );
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.user.id, 'courier.approve', 'courier_profiles', userId, {
    job_types: body.job_types,
  });

  return NextResponse.json({ ok: true });
}
