'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CourierPickupScanDialog } from '@/components/courier/courier-pickup-scan-dialog';
import { DELIVERY_JOB_STATUS_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import {
  COURIER_GPS_INTERVAL_MS,
  COURIER_GPS_MIN_MOVE_METERS,
} from '@/lib/delivery/tracking-config';
import { haversineMeters, type GeoPoint } from '@/lib/delivery/coords';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import type { DeliveryJobWithPayout } from '@/lib/delivery/enrich-job-payout';
import { DollarSign, MapPin } from 'lucide-react';

interface CourierJobListProps {
  available: DeliveryJobWithPayout[];
  mine: DeliveryJobWithPayout[];
  isOnline: boolean;
  jobType?: DeliveryJobType;
  outsideZoneCount?: number;
  zoneNames?: string[];
}

export function CourierJobList({
  available,
  mine,
  isOnline,
  jobType,
  outsideZoneCount = 0,
  zoneNames = [],
}: CourierJobListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const lastReportedRef = useRef<Map<string, GeoPoint>>(new Map());

  const activeJobs = useMemo(
    () => mine.filter((j) => ['assigned', 'picked_up'].includes(j.status)),
    [mine]
  );

  const scanJob = useMemo(
    () => (scanJobId ? mine.find((j) => j.id === scanJobId) ?? null : null),
    [mine, scanJobId]
  );

  const getCurrentPosition = (): Promise<GeoPoint | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 }
      );
    });

  const reportLocation = async (force = false) => {
    const pos = await getCurrentPosition();
    if (!pos) return;

    if (!force && activeJobs.length > 0) {
      const last = lastReportedRef.current.get('all');
      if (last && haversineMeters(last, pos) < COURIER_GPS_MIN_MOVE_METERS) {
        return;
      }
    }

    const res = await fetch('/api/courier/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pos),
    });

    if (res.ok) {
      lastReportedRef.current.set('all', pos);
    }
  };

  useEffect(() => {
    if (activeJobs.length === 0) {
      lastReportedRef.current.clear();
      return;
    }

    const tick = () => {
      void reportLocation();
    };

    tick();
    const interval = setInterval(tick, COURIER_GPS_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobs]);

  const claim = async (jobId: string) => {
    setLoadingId(jobId);
    const res = await fetch(`/api/courier/jobs/${jobId}/claim`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || '接單失敗');
    } else {
      void reportLocation(true);
      router.refresh();
    }
    setLoadingId(null);
  };

  const updateStatus = async (
    jobId: string,
    status: 'picked_up' | 'delivered',
    pickupCode?: string
  ) => {
    setLoadingId(jobId);
    const pos = await getCurrentPosition();
    const res = await fetch(`/api/courier/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
        ...(pickupCode ? { pickup_code: pickupCode } : {}),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || '更新失敗');
      setLoadingId(null);
      return false;
    }
    if (status === 'delivered') {
      lastReportedRef.current.delete('all');
    } else if (pos) {
      lastReportedRef.current.set('all', pos);
    }
    setScanJobId(null);
    router.refresh();
    setLoadingId(null);
    return true;
  };

  const accentBorder =
    jobType === 'food'
      ? 'border-amber-200 dark:border-amber-800'
      : jobType === 'parcel'
        ? 'border-sky-200 dark:border-sky-800'
        : 'border-gray-200 dark:border-gray-700';
  const accentAvailable =
    jobType === 'food'
      ? 'border-dashed border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
      : jobType === 'parcel'
        ? 'border-dashed border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-900/10'
        : 'border-dashed border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10';

  const PayoutBadge = ({ job }: { job: DeliveryJobWithPayout }) => {
    if (job.payout_total <= 0) return null;
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <DollarSign className="h-4 w-4" />
          預估實收 HK${job.payout_total.toFixed(0)}
        </p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
          總配送費 HK${job.payout_gross.toFixed(0)}
          {job.payout_platform_fee > 0 && ` · 平台服務費 HK$${job.payout_platform_fee.toFixed(0)}`}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          基本 HK${job.payout_base.toFixed(0)}
          {job.payout_surcharge > 0 && ` + 高評加價 HK$${job.payout_surcharge.toFixed(0)}`}
        </p>
        {job.payout_note && (
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{job.payout_note}</p>
        )}
        {job.courier_rating_count > 0 && job.courier_rating_avg != null && (
          <p className="mt-0.5 text-xs text-gray-500">
            您的客戶評分 {job.courier_rating_avg.toFixed(1)}（{job.courier_rating_count} 則）
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">我的任務</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">目前沒有進行中的配送</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((job) => (
              <li
                key={job.id}
                className={`rounded-xl border bg-white p-4 dark:bg-gray-800 ${accentBorder}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{JOB_TYPE_LABELS[job.job_type]}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      狀態：{DELIVERY_JOB_STATUS_LABELS[job.status]}
                    </p>
                    {job.status === 'assigned' && job.pickup_address && (
                      <div className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                        <p className="flex items-start gap-2 font-medium">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>取件：{job.pickup_address}</span>
                        </p>
                        {(job.pickup_contact_name || job.pickup_contact_phone) && (
                          <p className="mt-1 pl-6 text-xs opacity-90">
                            聯絡
                            {job.pickup_contact_name ? ` ${job.pickup_contact_name}` : ''}
                            {job.pickup_contact_phone ? ` · ${job.pickup_contact_phone}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {job.dropoff_address && (
                      <p className="mt-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <span>送達：{job.dropoff_address}</span>
                      </p>
                    )}
                    <PayoutBadge job={job} />
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'assigned' && (
                      <Button
                        size="sm"
                        className="min-h-10 px-4"
                        onClick={() => setScanJobId(job.id)}
                        disabled={loadingId === job.id}
                      >
                        掃描取件
                      </Button>
                    )}
                    {job.status === 'picked_up' && (
                      <Button
                        size="sm"
                        className="min-h-10 px-4"
                        onClick={() => updateStatus(job.id, 'delivered')}
                        disabled={loadingId === job.id}
                      >
                        確認送達
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">可接單任務</h2>
        {!isOnline ? (
          <p className="mt-2 text-sm text-orange-600">請先切換為上線狀態才能接單</p>
        ) : available.length === 0 && outsideZoneCount > 0 ? (
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-amber-600">
              您負責的區域
              {zoneNames.length > 0 ? `（${zoneNames.join('、')}）` : ''}
              內暫無可接單任務。
            </p>
            <p className="text-gray-500">
              另有 {outsideZoneCount} 筆任務在其他區域，需由該區配送員接單，或聯絡管理員調整您的服務區域。
            </p>
          </div>
        ) : available.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">暫無可接單任務</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {available.map((job) => (
              <li
                key={job.id}
                className={`rounded-xl p-4 ${accentAvailable}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{JOB_TYPE_LABELS[job.job_type]}</p>
                    <p className="text-xs text-gray-500 mt-1">訂單 #{job.order_id.slice(0, 8)}</p>
                    {job.pickup_address && (
                      <div className="mt-1 text-sm text-gray-600">
                        <p>取件：{job.pickup_address}</p>
                        {(job.pickup_contact_name || job.pickup_contact_phone) && (
                          <p className="text-xs text-gray-500">
                            聯絡
                            {job.pickup_contact_name ? ` ${job.pickup_contact_name}` : ''}
                            {job.pickup_contact_phone ? ` · ${job.pickup_contact_phone}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {job.dropoff_address && (
                      <p className="text-sm text-gray-600">送達：{job.dropoff_address}</p>
                    )}
                    <PayoutBadge job={job} />
                  </div>
                  <Button
                    size="sm"
                    className="min-h-10 px-4"
                    onClick={() => claim(job.id)}
                    disabled={loadingId === job.id}
                  >
                    {loadingId === job.id ? '接單中...' : '搶單'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CourierPickupScanDialog
        jobId={scanJob?.id || ''}
        pickupAddress={scanJob?.pickup_address}
        pickupContactName={scanJob?.pickup_contact_name}
        pickupContactPhone={scanJob?.pickup_contact_phone}
        open={!!scanJob}
        loading={loadingId === scanJob?.id}
        onClose={() => setScanJobId(null)}
        onConfirm={(code) => {
          if (!scanJob) return;
          void updateStatus(scanJob.id, 'picked_up', code);
        }}
      />
    </div>
  );
}
