'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { MERCHANT_TIER_LABELS, type MerchantTier } from '@/lib/merchant/tier-config';

type UpgradeRow = {
  id: string;
  merchant_id: string;
  current_tier: MerchantTier;
  requested_tier: MerchantTier;
  note: string | null;
  applied_at: string;
  merchants: { name: string; slug: string; tier: MerchantTier } | null;
};

export function TierUpgradeApprovalList({ initial }: { initial: UpgradeRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | undefined;
    if (action === 'reject') {
      reason = prompt('拒絕原因（選填）：') || undefined;
      if (reason === null) return;
    } else if (!confirm('確認通過此升級申請？商家等級將立即更新。')) {
      return;
    }

    setLoading(id);
    const res = await fetch(`/api/admin/merchants/tier-upgrades/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoading(null);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-white py-12 text-center text-gray-500 shadow dark:bg-gray-900">
        目前沒有待審核的商家升級申請
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {item.merchants?.name || '未知商家'}
              </h3>
              <p className="text-sm text-gray-500">/stores/{item.merchants?.slug}</p>
              <p className="text-sm">
                {MERCHANT_TIER_LABELS[item.current_tier]}
                <span className="mx-2 text-gray-400">→</span>
                <span className="font-medium text-orange-600">
                  {MERCHANT_TIER_LABELS[item.requested_tier]}
                </span>
              </p>
              {item.note && (
                <p className="text-sm text-gray-600 dark:text-gray-400">申請說明：{item.note}</p>
              )}
              <p className="text-xs text-gray-400">
                申請時間：{new Date(item.applied_at).toLocaleString('zh-TW')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => handleAction(item.id, 'approve')} disabled={loading === item.id}>
                <Check className="mr-1 h-4 w-4" />
                通過
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => handleAction(item.id, 'reject')}
                disabled={loading === item.id}
              >
                <X className="mr-1 h-4 w-4" />
                拒絕
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
