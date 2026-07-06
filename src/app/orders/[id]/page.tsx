import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { BuyerOrderActions } from '@/components/orders/buyer-order-actions';
import { BuyerOrderPaySection } from '@/components/orders/buyer-order-pay-section';
import { getBuyerOrder } from '@/lib/orders/server';
import { parseOrderItems } from '@/lib/orders/types';
import { isAwaitingMerchantPaymentConfirm } from '@/lib/orders/display-status';
import { DELIVERY_JOB_STATUS_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import { BuyerCourierRatingForm } from '@/components/orders/buyer-courier-rating-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getBuyerOrder(id);
  if (!order) notFound();

  const items = parseOrderItems(order.items);
  const job = order.deliveryJob;
  const isManualPending =
    order.status === 'pending' &&
    order.payment_method != null &&
    order.payment_method !== 'card';

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回訂單列表
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              訂單 #{order.id.slice(0, 8)}
            </h1>
            <div className="flex items-center gap-3">
              <BuyerOrderActions
                orderId={order.id}
                status={order.status}
                deliveryStatus={job?.status ?? null}
              />
              <OrderStatusBadge
                status={order.status}
                buyerPaymentClaimedAt={order.buyer_payment_claimed_at}
              />
            </div>
          </div>

          {order.status === 'pending' && isAwaitingMerchantPaymentConfirm(order) && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
              您已回報完成付款，商家核對款項後會更新為「已付款」。
            </div>
          )}

          {isManualPending && !isAwaitingMerchantPaymentConfirm(order) && (
            <div className="mt-6">
              <Link
                href={`/checkout/pay?orders=${order.id}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 sm:w-auto sm:px-6"
              >
                查看收款資訊並回報已付款
              </Link>
            </div>
          )}

          {order.status === 'pending' && !isAwaitingMerchantPaymentConfirm(order) && !isManualPending && (
            <BuyerOrderPaySection
              orderId={order.id}
              total={Number(order.total)}
              initialPaymentMethod={order.payment_method}
            />
          )}

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">商家</dt>
              <dd className="font-medium">{order.merchants?.name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">下單時間</dt>
              <dd>{new Date(order.created_at).toLocaleString('zh-TW')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">訂單金額</dt>
              <dd className="text-lg font-bold">${Number(order.total).toFixed(2)}</dd>
            </div>
            {order.shipping_name && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 shrink-0">收件人</dt>
                  <dd className="text-right">{order.shipping_name}</dd>
                </div>
                {order.shipping_phone && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">電話</dt>
                    <dd className="text-right">{order.shipping_phone}</dd>
                  </div>
                )}
                {order.shipping_address && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">收貨地址</dt>
                    <dd className="text-right">{order.shipping_address}</dd>
                  </div>
                )}
              </>
            )}
            {order.tracking_number && (
              <div className="flex justify-between">
                <dt className="text-gray-500">物流追蹤號</dt>
                <dd className="font-mono text-sm">{order.tracking_number}</dd>
              </div>
            )}
            {job && (
              <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                <p className="text-xs font-medium text-orange-800 dark:text-orange-300">配送狀態</p>
                <p className="mt-1 text-sm">
                  {JOB_TYPE_LABELS[job.job_type]} ·{' '}
                  {DELIVERY_JOB_STATUS_LABELS[job.status]}
                </p>
                {job.status === 'delivered' && !order.courierRatingSubmitted && (
                  <BuyerCourierRatingForm orderId={order.id} />
                )}
                {job.status === 'delivered' && order.courierRatingSubmitted && (
                  <p className="mt-2 text-xs text-gray-500">您已為本次配送評分</p>
                )}
              </div>
            )}
          </dl>

          <h2 className="mt-8 font-semibold text-gray-900 dark:text-white">商品明細</h2>
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <span className="font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
