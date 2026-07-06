'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
        <WifiOff className="h-8 w-8 text-orange-600" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">目前離線</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        請檢查網路連線後再試。已瀏覽過的頁面可能仍可離線查看。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/products">前往購物首頁</Link>
        </Button>
        <Button variant="outline" type="button" onClick={() => window.location.reload()}>
          重新整理
        </Button>
      </div>
    </div>
  );
}
