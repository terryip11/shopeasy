'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RotateCcw, XCircle } from 'lucide-react';
import type { OrderStatus } from '@/types/database';
import type { DeliveryJobStatus } from '@/types/database';

interface BuyerOrderActionsProps {
  orderId: string;
  status: OrderStatus;
  /** 配送任務狀態；已送達時不再顯示取消／退款 */
  deliveryStatus?: DeliveryJobStatus | null;
  layout?: 'inline' | 'stack';
}

export function BuyerOrderActions({
  orderId,
  status,
  deliveryStatus,
  layout = 'inline',
}: BuyerOrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'cancel' | 'refund' | null>(null);

  const handleCancel = async () => {
    const message =
      status === 'paid'
        ? '確認取消訂單？款項將透過原付款方式全額退回。'
        : '確認取消此待付款訂單？';
    if (!confirm(message)) return;

    setLoading('cancel');
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '取消失敗');
    }
    setLoading(null);
  };

  const handleRefundRequest = async () => {
    if (!confirm('確認申請退款？商家審核後將透過原付款方式退回款項。')) return;
    setLoading('refund');

    const res = await fetch(`/api/orders/${orderId}/refund-request`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '申請失敗');
    }
    setLoading(null);
  };

  const isDelivered = deliveryStatus === 'delivered';
  const canCancel = (status === 'pending' || status === 'paid') && !isDelivered;
  const canRefund = status === 'shipped' && !isDelivered;

  if (!canCancel && !canRefund) {
    return null;
  }

  const containerClass =
    layout === 'stack' ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2';

  return (
    <div className={containerClass} onClick={(e) => e.preventDefault()}>
      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 dark:text-red-400"
          onClick={handleCancel}
          disabled={loading !== null}
        >
          <XCircle className="h-4 w-4 mr-1" />
          {loading === 'cancel' ? '取消中...' : '取消訂單'}
        </Button>
      )}

      {canRefund && (
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600"
          onClick={handleRefundRequest}
          disabled={loading !== null}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          {loading === 'refund' ? '提交中...' : '申請退款'}
        </Button>
      )}
    </div>
  );
}
