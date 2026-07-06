'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { saveCart } from '@/lib/cart';

export function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      saveCart([]);
      setCleared(true);
    }
  }, [cleared]);

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">付款成功！</h1>
      <p className="mt-2 text-gray-500">感謝您的購買，訂單正在處理中。</p>
      {sessionId && (
        <p className="mt-2 text-xs text-gray-400">訂單編號: {sessionId.slice(0, 20)}...</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/products">繼續購物</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">返回首頁</Link>
        </Button>
      </div>
    </main>
  );
}
