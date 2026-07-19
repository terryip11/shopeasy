import { getActiveMerchantForUser } from '@/lib/auth/server';
import { getPlatformFeeRate } from '@/lib/finance/config';
import {
  getMerchantPlatformCreditBalance,
  listCreditLedgerForMerchant,
  listTopupRequestsForMerchant,
} from '@/lib/finance/platform-credit';
import { getPlatformPayoutSettings } from '@/lib/finance/platform-payout';
import { MerchantPlatformCreditPanel } from '@/components/merchant/merchant-platform-credit-panel';
import { ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MerchantPlatformCreditPage() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) redirect('/dashboard');

  const [balance, ledger, topups, payout] = await Promise.all([
    getMerchantPlatformCreditBalance(merchant.id),
    listCreditLedgerForMerchant(merchant.id),
    listTopupRequestsForMerchant(merchant.id),
    getPlatformPayoutSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回儀表板
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Wallet className="h-7 w-7 text-orange-500" />
          平台服務費
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          線下收款（FPS／銀行／微信／支付寶）確認時會自預付餘額扣除平台服務費。請保持足夠餘額。
        </p>
      </div>

      <MerchantPlatformCreditPanel
        balance={balance}
        feeRate={getPlatformFeeRate(merchant.tier)}
        tier={merchant.tier}
        platformPayout={payout}
        initialLedger={ledger}
        initialTopups={topups}
      />
    </div>
  );
}
