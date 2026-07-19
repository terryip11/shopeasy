import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, getMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createDeliveryJobFromOrder } from '@/lib/delivery/jobs';
import {
  listPickupLocationsForMerchant,
  locationToPickupDefaults,
  resolvePickupForOrderItems,
} from '@/lib/merchant/pickup-locations';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseOrderItems } from '@/lib/orders/types';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  job_type: z.enum(['food', 'parcel']),
  zone_id: z.string().uuid('請選擇配送區域'),
  pickup_location_id: z.string().uuid().optional().nullable(),
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
  const { data: order } = await supabase
    .from('orders')
    .select('merchant_id, items')
    .eq('id', orderId)
    .single();
  if (!order) {
    return NextResponse.json({ error: '訂單不存在' }, { status: 404 });
  }

  const merchantId = (order as { merchant_id: string }).merchant_id;
  const orderItems = (order as { items: unknown }).items;

  if (auth.role === 'merchant') {
    const merchant = await getMerchantForUser();
    if (!merchant || merchant.id !== merchantId) {
      return NextResponse.json({ error: '無權限操作此訂單' }, { status: 403 });
    }
  }

  try {
    const body = bodySchema.parse(await request.json());
    const admin = createAdminClient();
    const { data: merchantRow } = await admin
      .from('merchants')
      .select(
        'default_pickup_address, default_pickup_contact_name, default_pickup_contact_phone, company_address, contact_name, contact_phone'
      )
      .eq('id', merchantId)
      .maybeSingle();

    let pickupAddress = body.pickup_address?.trim() || '';
    let contactName = '';
    let contactPhone = '';
    let locationId: string | null = null;
    let note: string | null = null;

    if (body.pickup_location_id) {
      const locations = await listPickupLocationsForMerchant(merchantId, { admin: true });
      const loc = locations.find((l) => l.id === body.pickup_location_id);
      if (!loc) {
        return NextResponse.json({ error: '取件點不存在' }, { status: 400 });
      }
      const defaults = locationToPickupDefaults(loc);
      locationId = defaults.locationId;
      pickupAddress = pickupAddress || defaults.address;
      contactName = defaults.contactName;
      contactPhone = defaults.contactPhone;
    } else {
      const productIds = parseOrderItems(orderItems).map((i) => i.product_id);
      const defaults = await resolvePickupForOrderItems(
        merchantId,
        productIds,
        merchantRow as Parameters<typeof resolvePickupForOrderItems>[2],
        { admin: true }
      );
      locationId = defaults.locationId;
      pickupAddress = pickupAddress || defaults.address;
      contactName = defaults.contactName;
      contactPhone = defaults.contactPhone;
      note = defaults.note;
    }

    if (!pickupAddress || pickupAddress.length < 5) {
      return NextResponse.json(
        { error: '請選擇取件點或填寫取件地址（店鋪設置可管理取件點）' },
        { status: 400 }
      );
    }

    const notes = [body.notes, note].filter(Boolean).join('；') || undefined;

    const result = await createDeliveryJobFromOrder({
      orderId,
      jobType: body.job_type,
      zoneId: body.zone_id,
      pickupAddress,
      pickupContactName: contactName || undefined,
      pickupContactPhone: contactPhone || undefined,
      pickupLocationId: locationId,
      dropoffAddress: body.dropoff_address,
      notes,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await (supabase as any)
      .from('orders')
      .update({ shipping_zone_id: body.zone_id })
      .eq('id', orderId)
      .is('shipping_zone_id', null);

    return NextResponse.json(result.job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
