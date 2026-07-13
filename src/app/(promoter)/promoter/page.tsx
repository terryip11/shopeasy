import { Share2 } from 'lucide-react';
import { PromoterDashboard } from '@/components/promoter/promoter-dashboard';

export const dynamic = 'force-dynamic';

export default function PromoterPage() {
  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white">
          <Share2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">分享員工作台</h1>
          <p className="mt-1 text-sm text-gray-500">
            推廣商家商品、追蹤點擊與佣金收益
          </p>
        </div>
      </div>
      <PromoterDashboard />
    </div>
  );
}
