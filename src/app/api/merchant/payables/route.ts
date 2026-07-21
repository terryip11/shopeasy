import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { getMerchantPayables } from '@/lib/merchant/payables';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const [payables, merchantDirect] = await Promise.all([
      getMerchantPayables(merchant.id),
      isMerchantDirectPayout(),
    ]);
    return NextResponse.json({ ...payables, merchantDirect });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
