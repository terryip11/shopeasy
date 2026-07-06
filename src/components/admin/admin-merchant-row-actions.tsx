'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MerchantStatus } from '@/types/database';

type Props = {
  merchantId: string;
  status: MerchantStatus;
  canSuspend: boolean;
};

export function AdminMerchantRowActions({ merchantId, status, canSuspend }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const suspend = async () => {
    if (!confirm('確認停用此商家？其商品將無法銷售。')) return;

    setLoading(true);
    const res = await fetch(`/api/admin/merchants/${merchantId}/suspend`, { method: 'POST' });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      alert(data.error || '停用失敗');
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/admin/merchants/${merchantId}`} title="編輯">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      {canSuspend && status === 'active' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-orange-600 hover:text-orange-700"
          disabled={loading}
          onClick={() => void suspend()}
        >
          {loading ? '處理中...' : '停用'}
        </Button>
      )}
    </div>
  );
}
