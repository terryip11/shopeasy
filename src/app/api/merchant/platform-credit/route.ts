import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import {
  createTopupRequest,
  getMerchantPlatformCreditBalance,
  listCreditLedgerForMerchant,
  listTopupRequestsForMerchant,
} from '@/lib/finance/platform-credit';
import { getPlatformPayoutSettings } from '@/lib/finance/platform-payout';
import { getPlatformFeeRate } from '@/lib/finance/config';

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  const [balance, ledger, topups, payout] = await Promise.all([
    getMerchantPlatformCreditBalance(merchant.id),
    listCreditLedgerForMerchant(merchant.id),
    listTopupRequestsForMerchant(merchant.id),
    getPlatformPayoutSettings(),
  ]);

  return NextResponse.json({
    balance,
    feeRate: getPlatformFeeRate(merchant.tier),
    tier: merchant.tier,
    ledger,
    topups,
    platformPayout: payout,
  });
}

const topupSchema = z.object({
  amount: z.number().min(10, '單次儲值至少 HK$10').max(100000),
  merchant_note: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const merchant = await getActiveMerchantForUser();
    if (!merchant) {
      return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
    }

    const body = topupSchema.parse(await request.json());
    const result = await createTopupRequest({
      merchantId: merchant.id,
      amount: body.amount,
      merchantNote: body.merchant_note,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ request: result.request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
