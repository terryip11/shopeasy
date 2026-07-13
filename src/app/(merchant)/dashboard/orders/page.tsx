/**
 * 訂單管理頁面
 */

import { getMerchantOrders } from '@/lib/merchant/server';
import { getDeliveryZones } from '@/lib/courier/server';
import { getMerchantForUser } from '@/lib/auth/server';
import { defaultJobTypeForBusinessType } from '@/lib/merchant/business-type';
import { MerchantOrderActions } from '@/components/merchant/merchant-order-actions';
import { MerchantDeliveryCell } from '@/components/merchant/merchant-delivery-cell';
import { MerchantDeliveryJobInfo } from '@/components/merchant/merchant-delivery-job-info';
import { MerchantOrderStatusBadge } from '@/components/merchant/merchant-order-status-badge';
import { OrderRowProvider } from '@/components/merchant/order-row-context';
import { parseOrderItems } from '@/lib/orders/types';
import type { MerchantDeliveryJobSummary } from '@/lib/merchant/delivery-job-summary';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type Zone = { id: string; name: string };

type OrderItemProps = {
  order: OrderRow;
  job: MerchantDeliveryJobSummary | null;
  zones: Zone[];
  defaultJobType: 'food' | 'parcel';
  defaultPickupAddress: string | null;
};

function formatOrderMeta(order: OrderRow) {
  const items = parseOrderItems(order.items);
  return {
    itemSummary: items.map((i) => i.name).join('、') || '—',
    formattedDate: new Date(order.created_at).toLocaleString('zh-HK', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function MerchantOrderMobileCard({
  order,
  job,
  zones,
  defaultJobType,
  defaultPickupAddress,
}: OrderItemProps) {
  const { itemSummary, formattedDate } = formatOrderMeta(order);

  return (
    <OrderRowProvider initialStatus={order.status}>
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="font-mono text-sm font-semibold text-orange-600 hover:underline"
            >
              #{order.id.slice(0, 8)}
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {itemSummary}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              HK${order.total?.toFixed(2)}
            </p>
            <div className="mt-1 flex justify-end">
              <MerchantOrderStatusBadge
                buyerPaymentClaimedAt={order.buyer_payment_claimed_at}
              />
            </div>
          </div>
        </div>

        <dl className="mt-4 space-y-3 border-t border-gray-100 pt-3 text-sm dark:border-gray-700">
          <div>
            <dt className="text-xs font-medium text-gray-400">配送狀態</dt>
            <dd className="mt-1">
              <MerchantDeliveryJobInfo job={job} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">配送任務</dt>
            <dd className="mt-1">
              <MerchantDeliveryCell
                orderId={order.id}
                orderStatus={order.status}
                existingJob={job}
                shippingAddress={order.shipping_address}
                shippingZoneId={order.shipping_zone_id}
                zones={zones}
                defaultJobType={defaultJobType}
                defaultPickupAddress={defaultPickupAddress}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">下單時間</dt>
            <dd className="mt-0.5 text-gray-600 dark:text-gray-400">{formattedDate}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <MerchantOrderActions
            orderId={order.id}
            paymentMethod={order.payment_method}
            paymentClaimed={Boolean(order.buyer_payment_claimed_at)}
          />
          {job ? (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline"
            >
              <MapPin className="h-4 w-4" />
              地圖追蹤
            </Link>
          ) : null}
        </div>
      </article>
    </OrderRowProvider>
  );
}

function MerchantOrderDesktopRow({
  order,
  job,
  zones,
  defaultJobType,
  defaultPickupAddress,
}: OrderItemProps) {
  const { itemSummary, formattedDate } = formatOrderMeta(order);

  return (
    <OrderRowProvider initialStatus={order.status}>
      <TableRow>
        <TableCell className="font-mono text-sm">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="text-orange-600 hover:underline"
          >
            #{order.id.slice(0, 8)}
          </Link>
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-sm text-gray-500">
          {itemSummary}
        </TableCell>
        <TableCell className="whitespace-nowrap">HK${order.total?.toFixed(2)}</TableCell>
        <TableCell>
          <MerchantOrderStatusBadge
            buyerPaymentClaimedAt={order.buyer_payment_claimed_at}
          />
        </TableCell>
        <TableCell>
          <MerchantDeliveryJobInfo job={job} />
        </TableCell>
        <TableCell>
          <MerchantDeliveryCell
            orderId={order.id}
            orderStatus={order.status}
            existingJob={job}
            shippingAddress={order.shipping_address}
            shippingZoneId={order.shipping_zone_id}
            zones={zones}
            defaultJobType={defaultJobType}
            defaultPickupAddress={defaultPickupAddress}
          />
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">{formattedDate}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <MerchantOrderActions
              orderId={order.id}
              paymentMethod={order.payment_method}
              paymentClaimed={Boolean(order.buyer_payment_claimed_at)}
            />
            {job ? (
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
              >
                <MapPin className="h-3 w-3" />
                地圖追蹤
              </Link>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
    </OrderRowProvider>
  );
}

export default async function OrdersPage() {
  const [{ orders, totalCount, page, totalPages, deliveryJobs }, zones, merchant] =
    await Promise.all([
      getMerchantOrders(1, 50),
      getDeliveryZones(),
      getMerchantForUser(),
    ]);

  const defaultJobType = defaultJobTypeForBusinessType(merchant?.business_type);
  const defaultPickupAddress = merchant?.company_address ?? null;

  const listProps = (order: OrderRow): OrderItemProps => ({
    order,
    job: deliveryJobs[order.id] ?? null,
    zones,
    defaultJobType,
    defaultPickupAddress,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回儀表板
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">訂單管理</h1>
        <p className="text-sm text-gray-500">
          總計 {totalCount} 筆訂單 · 已付款訂單可建立配送任務
        </p>
      </div>

      <div className="space-y-3 md:hidden">
        {orders.length > 0 ? (
          orders.map((order) => (
            <MerchantOrderMobileCard key={order.id} {...listProps(order)} />
          ))
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            暫無訂單數據
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-gray-800 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>訂單 ID</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>配送狀態</TableHead>
              <TableHead>配送任務</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <MerchantOrderDesktopRow key={order.id} {...listProps(order)} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  暫無訂單數據
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:justify-start">
          <p className="text-sm text-gray-500">
            第 {page} / {totalPages} 頁
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1}>
              上一頁
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages}>
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
