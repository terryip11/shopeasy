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

export default async function OrdersPage() {
  const [{ orders, totalCount, page, totalPages, deliveryJobs }, zones, merchant] = await Promise.all([
    getMerchantOrders(1, 50),
    getDeliveryZones(),
    getMerchantForUser(),
  ]);

  const defaultJobType = defaultJobTypeForBusinessType(merchant?.business_type);
  const defaultPickupAddress = merchant?.company_address ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回儀表板
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">訂單管理</h1>
        <p className="text-sm text-gray-500">
          總計 {totalCount} 筆訂單 · 已付款訂單可建立配送任務
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm dark:bg-gray-800 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>訂單 ID</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>配送資訊</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => {
                const items = parseOrderItems(order.items);
                const job = deliveryJobs[order.id] ?? null;
                return (
                  <OrderRowProvider key={order.id} initialStatus={order.status}>
                  <TableRow>
                    <TableCell className="font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-gray-500">
                      {items.map((i) => i.name).join('、')}
                    </TableCell>
                    <TableCell>${order.total?.toFixed(2)}</TableCell>
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
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('zh-TW')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <MerchantOrderActions
                          orderId={order.id}
                          paymentMethod={order.payment_method}
                          paymentClaimed={Boolean(order.buyer_payment_claimed_at)}
                        />
                        {job && (
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            地圖追蹤
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  </OrderRowProvider>
                );
              })
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1}>
            上一頁
          </Button>
          <Button variant="outline" size="sm" disabled={page === totalPages}>
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
