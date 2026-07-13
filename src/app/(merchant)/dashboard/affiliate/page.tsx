import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import { MerchantAffiliatePanel } from '@/components/merchant/merchant-affiliate-panel';

export const dynamic = 'force-dynamic';

export default function MerchantAffiliatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-violet-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              分享推廣
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            設定哪些商品可讓分享員推廣，以及佣金分配方案
          </p>
        </div>
      </div>
      <MerchantAffiliatePanel />
    </div>
  );
}
