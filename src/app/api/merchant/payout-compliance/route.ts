import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { refreshMerchantPayoutRestriction } from '@/lib/merchant/payout-compliance';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const merchantDirect = await isMerchantDirectPayout();
    if (!merchantDirect) {
      return NextResponse.json({
        merchantDirect: false,
        level: 'ok',
        message: null,
        deliveryBlocked: false,
      });
    }
    const compliance = await refreshMerchantPayoutRestriction(merchant.id);
    return NextResponse.json({ merchantDirect: true, ...compliance });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('payout_delivery_blocked') || msg.includes('payout_unpaid_reports')) {
      return NextResponse.json(
        { error: '請執行 supabase/migrate-v55-payout-overdue.sql' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
