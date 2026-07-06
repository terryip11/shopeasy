import { NextResponse } from 'next/server';
import { getMerchantOrderTracking } from '@/lib/merchant/delivery-tracking';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const tracking = await getMerchantOrderTracking(id);

  if (!tracking) {
    return NextResponse.json({ error: '訂單不存在或無權限' }, { status: 404 });
  }

  return NextResponse.json(tracking);
}
