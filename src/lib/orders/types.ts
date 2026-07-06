/**
 * 訂單相關類型與工具
 */

import type { OrderStatus } from '@/types/database';

export type OrderItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant_id?: string;
  variant_label?: string;
  option_selections?: Array<{
    group_id: string;
    option_ids: string[];
    labels: string[];
    price_delta: number;
  }>;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已發貨',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
  refund_requested: '退款申請中',
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refund_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

/** 進行中訂單（計入「共 X 筆」） */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'refund_requested',
];

/** 已關閉訂單（不計入進行中數量） */
export const CLOSED_ORDER_STATUSES: OrderStatus[] = ['cancelled', 'refunded', 'completed'];

export function parseOrderItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];
  return items as OrderItem[];
}
