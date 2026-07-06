import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, getMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createDeliveryJobFromOrder } from '@/lib/delivery/jobs';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  job_type: z.enum(['food', 'parcel']),
  zone_id: z.string().uuid().optional(),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().min(1, '請填寫送達地址'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireRole(['merchant', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id: orderId } = await context.params;

  const supabase = await createClient();
  const { data: order } = await supabase.from('orders').select('merchant_id').eq('id', orderId).single();
  if (!order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  if (auth.role === 'merchant') {
    const merchant = await getMerchantForUser();
    if (!merchant || merchant.id !== (order as { merchant_id: string }).merchant_id) {
      return NextResponse.json({ error: '無權限操作此訂單' }, { status: 403 });
    }
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result = await createDeliveryJobFromOrder({
      orderId,
      jobType: body.job_type,
      zoneId: body.zone_id,
      pickupAddress: body.pickup_address,
      dropoffAddress: body.dropoff_address,
      notes: body.notes,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
