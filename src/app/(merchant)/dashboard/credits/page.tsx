import { getActiveMerchantForUser } from '@/lib/auth/server';
import { ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function MerchantPlatformCreditPage() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) redirect('/dashboard');

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
          <CreditCard className="h-7 w-7 text-orange-500" />
          平台收費說明
        </h1>
      </div>
      <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-6 dark:border-orange-900 dark:bg-orange-950/30">
        <p className="text-base font-semibold text-orange-950 dark:text-orange-100">
          目前平台以「訂閱」為主要收費方式
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-orange-900/90 dark:text-orange-100/90">
          <li>不對每筆訂單抽取貨款利潤／平台服務費。</li>
          <li>買家貨款由您直接收取（FPS／銀行等）。</li>
          <li>分享員佣金、配送員工資請至「應付佣金／工資」依 FPS 直付並標記已付。</li>
          <li>請在儀表板管理訂閱方案（高級／尊貴）。</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard">前往儀表板管理訂閱</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/payables">應付佣金／工資</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
