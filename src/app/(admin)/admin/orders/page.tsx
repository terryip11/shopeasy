import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission } from '@/lib/auth/permissions';
import { getAdminOrdersList } from '@/lib/admin/orders';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { PAYMENT_METHOD_META, type MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import type { OrderStatus } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

function paymentLabel(method: string | null) {
  if (!method) return '—';
  if (method in PAYMENT_METHOD_META) {
    return PAYMENT_METHOD_META[method as MerchantPaymentMethod].label;
  }
  return method;
}

function recipientLabel(order: {
  shipping_name: string | null;
  buyer_name: string | null;
}) {
  return order.shipping_name?.trim() || order.buyer_name?.trim() || '—';
}

export default async function AdminOrdersPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'orders:read')) {
    redirect('/admin');
  }

  const { orders, totalCount } = await getAdminOrdersList(1, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">訂單查詢</h1>
        <p className="mt-1 text-sm text-gray-500">共 {totalCount} 筆訂單</p>
      </div>

      <div className="space-y-3 md:hidden">
        {orders.length > 0 ? (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-medium text-orange-600">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {recipientLabel(order)}
                  </p>
                  {order.shipping_phone && (
                    <p className="text-xs text-gray-500">{order.shipping_phone}</p>
                  )}
                </div>
                <OrderStatusBadge status={order.status as OrderStatus} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <p className="text-gray-400">商家</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {order.merchant_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">金額</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    HK${order.total.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">付款</p>
                  <p>{paymentLabel(order.payment_method)}</p>
                </div>
                <div>
                  <p className="text-gray-400">日期</p>
                  <p>{new Date(order.created_at).toLocaleString('zh-HK')}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl bg-white px-4 py-12 text-center text-gray-500 shadow dark:bg-gray-900">
            暫無訂單
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>訂單</TableHead>
              <TableHead>收件人</TableHead>
              <TableHead>商家</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>付款方式</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>日期</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-orange-600 hover:underline"
                    >
                      #{order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {recipientLabel(order)}
                    </p>
                    {order.shipping_phone && (
                      <p className="text-xs text-gray-500">{order.shipping_phone}</p>
                    )}
                    {order.shipping_name && order.buyer_name && order.buyer_name !== order.shipping_name && (
                      <p className="text-xs text-gray-400">帳號：{order.buyer_name}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.merchant_name || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    HK${order.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {paymentLabel(order.payment_method)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleString('zh-HK')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  暫無訂單
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
