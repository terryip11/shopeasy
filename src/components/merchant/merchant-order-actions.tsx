'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Truck, RotateCcw, XCircle } from 'lucide-react';
import { useOrderNotifications } from '@/components/merchant/order-notification-provider';
import { useOrderRowStatus } from '@/components/merchant/order-row-context';
import { attentionDelta } from '@/lib/merchant/order-attention';
interface MerchantOrderActionsProps {
  orderId: string;
  paymentMethod?: string | null;
  paymentClaimed?: boolean;
}

export function MerchantOrderActions({
  orderId,
  paymentMethod,
  paymentClaimed = false,
}: MerchantOrderActionsProps) {
  const router = useRouter();
  const { status, setStatus } = useOrderRowStatus();
  const { adjustAttentionCount } = useOrderNotifications();
  const [loading, setLoading] = useState<
    'ship' | 'refund' | 'markPaid' | 'confirmPaid' | 'cancel' | null
  >(null);

  const refreshOrdersPage = () => {
    router.refresh();
  };

  const handleShip = async () => {
    const tracking = prompt('請輸入物流追蹤號：');
    if (!tracking?.trim()) return;
    if (!confirm('確認標記此訂單為已發貨？')) return;
    setLoading('ship');

    const res = await fetch(`/api/merchant/orders/${orderId}/ship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: tracking.trim() }),
    });
    if (res.ok) {
      adjustAttentionCount(attentionDelta('paid', 'shipped'));
      setStatus('shipped');
      refreshOrdersPage();
    } else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoading(null);
  };

  const handleRefund = async () => {
    const isApproval = status === 'refund_requested';
    const msg = isApproval
      ? '確認核准退款？訂單將標記為已退款，此操作不可撤銷。'
      : '確認退款？信用卡訂單將透過 Stripe 退回買家，此操作不可撤銷。';
    if (!confirm(msg)) return;    setLoading('refund');

    const res = await fetch(`/api/merchant/orders/${orderId}/refund`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      adjustAttentionCount(attentionDelta(status, 'refunded'));
      setStatus('refunded');
      refreshOrdersPage();
    } else {
      alert(data.error || '退款失敗');
    }
    setLoading(null);
  };

  const handleCancelPending = async () => {
    if (
      !confirm(
        '確認取消此待付款訂單？\n\n適用於買家重複下單或未實際付款的訂單。取消後買家無需付款。'
      )
    ) {
      return;
    }
    setLoading('cancel');

    const res = await fetch(`/api/merchant/orders/${orderId}/cancel`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      adjustAttentionCount(attentionDelta('pending', 'cancelled'));
      setStatus('cancelled');
      refreshOrdersPage();
    } else {
      alert(data.error || '取消失敗');
    }
    setLoading(null);
  };

  const handleConfirmPaid = async () => {
    if (!confirm('確認已收到買家款項？訂單將標記為已付款。')) return;
    setLoading('confirmPaid');

    const res = await fetch(`/api/merchant/orders/${orderId}/confirm-payment`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      adjustAttentionCount(attentionDelta('pending', 'paid'));
      setStatus('paid');
      refreshOrdersPage();
    } else {
      const msg = data.error || '確認失敗';
      if (String(msg).includes('預付餘額') || String(msg).includes('平台服務費')) {
        if (confirm(`${msg}\n\n是否前往「平台服務費」儲值？`)) {
          router.push('/dashboard/credits');
        }
      } else {
        alert(msg);
      }
    }
    setLoading(null);
  };

  const handleMarkPaid = async () => {
    if (!confirm('開發模式：將此訂單標記為已付款？')) return;
    setLoading('markPaid');

    const res = await fetch(`/api/dev/orders/${orderId}/mark-paid`, { method: 'POST' });
    if (res.ok) {
      adjustAttentionCount(attentionDelta('pending', 'paid'));
      setStatus('paid');
      refreshOrdersPage();
    } else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoading(null);
  };

  const isManualPending =
    status === 'pending' && paymentMethod != null && paymentMethod !== 'card';

  const showDevMarkPaid =
    process.env.NODE_ENV === 'development' && status === 'pending' && !isManualPending;

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-start">
      <div className="flex flex-wrap items-center gap-2">
        {isManualPending && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700"
              onClick={handleConfirmPaid}
              disabled={loading !== null}
            >
              {loading === 'confirmPaid' ? '處理中...' : paymentClaimed ? '確認已收款' : '標記已收款'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-red-600"
              onClick={handleCancelPending}
              disabled={loading !== null}
            >
              <XCircle className="mr-1 h-4 w-4" />
              {loading === 'cancel' ? '處理中...' : '取消訂單'}
            </Button>
          </>
        )}
        {showDevMarkPaid && (
          <Button
            variant="outline"
            size="sm"
            className="text-amber-700 border-amber-300"
            onClick={handleMarkPaid}
            disabled={loading !== null}
          >
            {loading === 'markPaid' ? '處理中...' : '標記已付款（開發）'}
          </Button>
        )}
        {status === 'paid' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShip}
            disabled={loading !== null}
          >
            <Truck className="h-4 w-4 mr-1" />
            {loading === 'ship' ? '處理中...' : '標記發貨'}
          </Button>
        )}
        {(status === 'paid' || status === 'shipped' || status === 'refund_requested') && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={handleRefund}
            disabled={loading !== null}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {loading === 'refund' ? '退款中...' : status === 'refund_requested' ? '核准退款' : '退款'}
          </Button>
        )}
      </div>
      {isManualPending && (
        <p className="text-[11px] text-gray-500">
          確認收款會扣除平台服務費預付餘額；不足請先至「平台服務費」儲值。
        </p>
      )}
    </div>
  );
}
