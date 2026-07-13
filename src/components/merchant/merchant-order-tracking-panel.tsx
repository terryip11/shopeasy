'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Package, Phone, User } from 'lucide-react';
import { DeliveryTrackMap } from '@/components/merchant/delivery-track-map';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { DELIVERY_JOB_STATUS_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import { createClient } from '@/lib/supabase/client';
import { patchTrackingFromJobRow } from '@/lib/delivery/patch-tracking';
import type { MerchantOrderTracking } from '@/lib/merchant/delivery-tracking-types';
import type { OrderStatus } from '@/types/database';

type Props = {
  orderId: string;
  initial: MerchantOrderTracking;
};

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-HK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MerchantOrderTrackingPanel({ orderId, initial }: Props) {
  const [tracking, setTracking] = useState(initial);
  const needsFullRefreshRef = useRef(false);

  const refreshFull = useCallback(async () => {
    const res = await fetch(`/api/merchant/orders/${orderId}/tracking`);
    if (res.ok) {
      setTracking(await res.json());
    }
  }, [orderId]);

  useEffect(() => {
    const jobId = tracking.job?.id;
    const jobActive =
      tracking.job && ['pending', 'assigned', 'picked_up'].includes(tracking.job.status);
    if (!jobId || !jobActive) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`delivery-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as Parameters<typeof patchTrackingFromJobRow>[1];
          setTracking((prev) => {
            const { tracking: next, needsFullRefresh } = patchTrackingFromJobRow(prev, row);
            if (needsFullRefresh) needsFullRefreshRef.current = true;
            return next;
          });
          if (needsFullRefreshRef.current) {
            needsFullRefreshRef.current = false;
            void refreshFull();
          }
        }
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshFull();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [tracking.job?.id, tracking.job?.status, refreshFull]);

  const { order, job } = tracking;
  const dropoff =
    job?.dropoff_lat != null && job.dropoff_lng != null
      ? { lat: job.dropoff_lat, lng: job.dropoff_lng }
      : null;
  const courier =
    job?.courier_lat != null && job.courier_lng != null
      ? { lat: job.courier_lat, lng: job.courier_lng }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回訂單列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
          訂單追蹤 #{order.id.slice(0, 8)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <OrderStatusBadge status={order.status as OrderStatus} />
          <span>HK${order.total.toFixed(2)}</span>
          <span>{new Date(order.created_at).toLocaleString('zh-HK')}</span>
        </div>
      </div>

      {order.tracking_number && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <Package className="h-5 w-5 text-blue-600" />
            快遞物流追蹤號
          </h2>
          <p className="mt-2 font-mono text-lg font-semibold text-blue-800 dark:text-blue-200">
            {order.tracking_number}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            此單號為您「標記發貨」時填寫的<strong>外部快遞單號</strong>，供買家自行到快遞公司網站查件。
            下方地圖追蹤的是<strong>平台配送員</strong>位置，不會顯示快遞單號路線。
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">收貨資訊</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{order.shipping_name || '—'}</p>
          {order.shipping_phone && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              {order.shipping_phone}
            </p>
          )}
          {order.shipping_address && (
            <p className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              {order.shipping_address}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">配送狀態</h2>
          {!job ? (
            <p className="text-sm text-gray-500">尚未建立配送任務</p>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-gray-500">類型：</span>
                {JOB_TYPE_LABELS[job.job_type as keyof typeof JOB_TYPE_LABELS] || job.job_type}
                {job.zone_name ? ` · ${job.zone_name}` : ''}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">狀態：</span>
                <span className="font-medium text-orange-600">
                  {DELIVERY_JOB_STATUS_LABELS[job.status as keyof typeof DELIVERY_JOB_STATUS_LABELS] ||
                    job.status}
                </span>
              </p>
              {job.courier ? (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
                    <User className="h-4 w-4" />
                    接單配送員：{job.courier.display_name || '配送員'}
                  </p>
                  {job.courier.phone && (
                    <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <Phone className="h-4 w-4" />
                      {job.courier.phone}
                    </p>
                  )}
                  {job.courier_location_at && (
                    <p className="text-xs text-green-600">
                      最後位置更新：{formatTime(job.courier_location_at)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">等待配送員接單…</p>
              )}
              <dl className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <dt>接單時間</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{formatTime(job.assigned_at)}</dd>
                </div>
                <div>
                  <dt>取件時間</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{formatTime(job.picked_up_at)}</dd>
                </div>
                <div>
                  <dt>送達時間</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{formatTime(job.delivered_at)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>

      {dropoff && (
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 sm:p-6">
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">平台配送地圖</h2>
          <p className="mb-4 text-sm text-gray-500">
            顯示送達地址與平台配送員即時位置（與快遞物流單號無關）
          </p>
          {job?.dropoff_map_label && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              {job.dropoff_map_label}
            </p>
          )}
          {!courier && job && ['assigned', 'picked_up'].includes(job.status) && (
            <p className="text-sm text-amber-600 mb-3">
              配送員尚未回報 GPS 位置，地圖僅顯示送達地址
            </p>
          )}
          <DeliveryTrackMap
            dropoff={dropoff}
            courier={courier}
            className="h-[min(50vh,420px)] min-h-[240px] w-full rounded-2xl border border-gray-200 dark:border-gray-700 z-0 sm:min-h-[320px]"
          />
          {job?.dropoff_address && (
            <p className="mt-3 text-sm text-gray-500 flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              送達：{job.dropoff_address}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
