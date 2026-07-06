import Link from 'next/link';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { BuyerOrderActions } from '@/components/orders/buyer-order-actions';
import { parseOrderItems } from '@/lib/orders/types';
import { isAwaitingMerchantPaymentConfirm } from '@/lib/orders/display-status';
import type { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'] & {
  merchants?: { name: string; slug: string } | null;
  deliveryJobStatus?: Database['public']['Tables']['delivery_jobs']['Row']['status'] | null;
};

interface BuyerOrderCardProps {
  order: Order;
  showActions?: boolean;
}

export function BuyerOrderCard({ order, showActions = true }: BuyerOrderCardProps) {
  const items = parseOrderItems(order.items);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link href={`/orders/${order.id}`} className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">訂單 #{order.id.slice(0, 8)}</p>
          <p className="mt-1 text-sm text-gray-500">
            {order.merchants?.name || '商家'} ·{' '}
            {new Date(order.created_at).toLocaleString('zh-TW')}
          </p>
          <p className="mt-3 text-sm text-gray-500">
            {items.map((i) => `${i.name} × ${i.quantity}`).join('、')}
          </p>
        </Link>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            <OrderStatusBadge
              status={order.status}
              buyerPaymentClaimedAt={order.buyer_payment_claimed_at}
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ${Number(order.total).toFixed(2)}
            </span>
          </div>
          {showActions && (
            <BuyerOrderActions
              orderId={order.id}
              status={order.status}
              deliveryStatus={order.deliveryJobStatus}
              layout="stack"
            />
          )}
          {showActions && order.status === 'pending' && !isAwaitingMerchantPaymentConfirm(order) && (
            <Link
              href={`/orders/${order.id}`}
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              選擇付款方式 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
