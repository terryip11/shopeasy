import type { OrderStatus } from '@/types/database';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/orders/types';

export type OrderStatusDisplay = {
  label: string;
  className: string;
};

const PENDING_CLAIMED: OrderStatusDisplay = {
  label: '待商家確認',
  className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function resolveOrderStatusDisplay(order: {
  status: OrderStatus;
  buyer_payment_claimed_at?: string | null;
}): OrderStatusDisplay {
  if (order.status === 'pending' && order.buyer_payment_claimed_at) {
    return PENDING_CLAIMED;
  }

  return {
    label: ORDER_STATUS_LABELS[order.status],
    className: ORDER_STATUS_STYLES[order.status],
  };
}

export function isAwaitingMerchantPaymentConfirm(order: {
  status: OrderStatus;
  buyer_payment_claimed_at?: string | null;
}): boolean {
  return order.status === 'pending' && Boolean(order.buyer_payment_claimed_at);
}
