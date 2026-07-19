import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import {
  createPickupLocation,
  listPickupLocationsForMerchant,
} from '@/lib/merchant/pickup-locations';

const bodySchema = z.object({
  name: z.string().min(1, '請填寫取件點名稱').max(80),
  address: z.string().min(5, '請填寫完整地址（至少 5 字）').max(500),
  contact_name: z.string().max(100).nullable().optional(),
  contact_phone: z.string().max(30).nullable().optional(),
  is_default: z.boolean().optional(),
});

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  const locations = await listPickupLocationsForMerchant(merchant.id);
  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await getActiveMerchantForUser();
    if (!merchant) {
      return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
    }

    const body = bodySchema.parse(await request.json());
    const result = await createPickupLocation(merchant.id, body);
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
