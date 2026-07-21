import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Banknote } from 'lucide-react';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { getMerchantPayables } from '@/lib/merchant/payables';
import { refreshMerchantPayoutRestriction } from '@/lib/merchant/payout-compliance';
import { MerchantPayablesPanel } from '@/components/merchant/merchant-payables-panel';
import { MerchantPayoutOverdueBanner } from '@/components/merchant/merchant-payout-overdue-banner';

export const dynamic = 'force-dynamic';

export default async function MerchantPayablesPage() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) redirect('/dashboard');

  const [payables, compliance] = await Promise.all([
    getMerchantPayables(merchant.id),
    refreshMerchantPayoutRestriction(merchant.id),
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
          <Banknote className="h-7 w-7 text-orange-500" />
          應付分享員／配送員
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          依系統金額以 FPS 直接轉帳給對方，完成後請標記已付。平台不代收代付。
        </p>
      </div>

      <MerchantPayoutOverdueBanner compliance={compliance} />
      <MerchantPayablesPanel initial={payables} />
    </div>
  );
}
