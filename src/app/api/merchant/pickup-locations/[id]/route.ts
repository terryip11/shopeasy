import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import {
  deletePickupLocation,
  setDefaultPickupLocation,
  updatePickupLocation,
} from '@/lib/merchant/pickup-locations';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  name: z.string().min(1, '請填寫取件點名稱').max(80).optional(),
  address: z.string().min(5, '請填寫完整地址（至少 5 字）').max(500).optional(),
  contact_name: z.string().max(100).nullable().optional(),
  contact_phone: z.string().max(30).nullable().optional(),
  is_default: z.boolean().optional(),
  action: z.enum(['set_default']).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const merchant = await getActiveMerchantForUser();
    if (!merchant) {
      return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());

    if (body.action === 'set_default') {
      const result = await setDefaultPickupLocation(merchant.id, id);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ location: result.data });
    }

    if (!body.name || !body.address) {
      return NextResponse.json({ error: '請填寫名稱與地址' }, { status: 400 });
    }

    const result = await updatePickupLocation(merchant.id, id, {
      name: body.name,
      address: body.address,
      contact_name: body.contact_name,
      contact_phone: body.contact_phone,
      is_default: body.is_default,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ location: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const merchant = await getActiveMerchantForUser();
    if (!merchant) {
      return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
    }

    const { id } = await context.params;
    const result = await deletePickupLocation(merchant.id, id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
