'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bike, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { OrderStatus } from '@/types/database';
import type { MerchantDeliveryJobSummary } from '@/lib/merchant/delivery-job-summary';
import type { PickupLocationItem } from '@/components/merchant/merchant-pickup-locations-form';

type Zone = { id: string; name: string };

interface DeliveryJobSummary extends MerchantDeliveryJobSummary {}

interface MerchantDeliveryCellProps {
  orderId: string;
  orderStatus: OrderStatus;
  existingJob?: DeliveryJobSummary | null;
  shippingAddress?: string | null;
  shippingZoneId?: string | null;
  zones?: Zone[];
  defaultJobType?: 'food' | 'parcel';
  pickupLocations?: PickupLocationItem[];
  /** 依訂單商品解析出的建議取件點 */
  suggestedPickupLocationId?: string | null;
  pickupConflict?: boolean;
}

export function MerchantDeliveryCell({
  orderId,
  orderStatus,
  existingJob,
  shippingAddress,
  shippingZoneId,
  zones = [],
  defaultJobType = 'parcel',
  pickupLocations = [],
  suggestedPickupLocationId = null,
  pickupConflict = false,
}: MerchantDeliveryCellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const defaultLoc =
    pickupLocations.find((l) => l.id === suggestedPickupLocationId) ??
    pickupLocations.find((l) => l.is_default) ??
    pickupLocations[0] ??
    null;

  const [open, setOpen] = useState(false);
  const [jobType, setJobType] = useState<'food' | 'parcel'>(defaultJobType);
  const [zoneId, setZoneId] = useState(shippingZoneId || '');
  const [dropoff, setDropoff] = useState(shippingAddress || '');
  const [pickupLocationId, setPickupLocationId] = useState(defaultLoc?.id || '');
  const [pickup, setPickup] = useState(defaultLoc?.address || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const loc =
        pickupLocations.find((l) => l.id === suggestedPickupLocationId) ??
        pickupLocations.find((l) => l.is_default) ??
        pickupLocations[0] ??
        null;
      setJobType(defaultJobType);
      setDropoff(shippingAddress || '');
      setZoneId(shippingZoneId || '');
      setPickupLocationId(loc?.id || '');
      setPickup(loc?.address || '');
    }
  }, [
    open,
    shippingAddress,
    shippingZoneId,
    defaultJobType,
    pickupLocations,
    suggestedPickupLocationId,
  ]);

  if (existingJob) {
    const typeLabel =
      existingJob.job_type === 'food' ? JOB_TYPE_LABELS.food : JOB_TYPE_LABELS.parcel;

    return (
      <div className="min-w-[8rem] space-y-1">
        <p className="text-xs font-medium text-gray-900 dark:text-white">{typeLabel}</p>
        <Link
          href={`/dashboard/orders/${orderId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline"
        >
          <MapPin className="h-3 w-3" />
          追蹤
        </Link>
      </div>
    );
  }

  if (orderStatus === 'pending') {
    return <span className="text-xs text-gray-400">待付款後可建立</span>;
  }

  if (orderStatus !== 'paid' && orderStatus !== 'shipped') {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const onSelectLocation = (id: string) => {
    setPickupLocationId(id);
    const loc = pickupLocations.find((l) => l.id === id);
    if (loc) setPickup(loc.address);
  };

  const submit = async () => {
    if (!pickupLocationId && (!pickup.trim() || pickup.trim().length < 5)) {
      alert('請選擇取件點或填寫取件地址');
      return;
    }
    if (!dropoff.trim()) {
      alert('請填寫送達地址');
      return;
    }
    if (!zoneId) {
      alert('請選擇配送區域');
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/merchant/orders/${orderId}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_type: jobType,
        zone_id: zoneId,
        pickup_location_id: pickupLocationId || null,
        pickup_address: pickup.trim() || undefined,
        dropoff_address: dropoff,
      }),
    });
    if (res.ok) {
      setOpen(false);
      if (pathname.startsWith('/dashboard/orders')) {
        router.refresh();
      }
    } else {
      const data = await res.json();
      alert(data.error || '建立失敗');
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="gap-1 whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        <Bike className="h-4 w-4" />
        建立配送
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">建立配送任務</h3>
            <p className="mt-1 text-sm text-gray-500">訂單 #{orderId.slice(0, 8)}</p>
            {shippingAddress && (
              <p className="mt-2 text-xs text-green-600">
                已帶入買家收貨地址；請選擇配送區域以供配送員接單
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {(['food', 'parcel'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setJobType(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    jobType === t
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700'
                  }`}
                >
                  {t === 'food' ? '外賣配送' : '貨物配送'}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {zones.length > 0 && (
                <div>
                  <Label>配送區域 *</Label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="">請選擇</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>取件點 *</Label>
                {pickupLocations.length > 0 ? (
                  <>
                    <select
                      value={pickupLocationId}
                      onChange={(e) => onSelectLocation(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {pickupLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {l.is_default ? '（預設）' : ''} — {l.address}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">地址：{pickup || '—'}</p>
                    {pickupConflict && (
                      <p className="mt-1 text-xs text-amber-600">
                        此訂單商品取件點不一致，已建議店鋪預設；請確認後再建立。
                      </p>
                    )}
                    {!pickupConflict && suggestedPickupLocationId && (
                      <p className="mt-1 text-xs text-green-600">已依商品設定帶入取件點</p>
                    )}
                  </>
                ) : (
                  <>
                    <Input
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="mt-1"
                      placeholder="配送員到店取件地址"
                      required
                    />
                    <p className="mt-1 text-xs text-amber-600">
                      尚未設定取件點，請至「店鋪設置 → 配送設置」新增
                    </p>
                  </>
                )}
              </div>
              <div>
                <Label>送達地址 *</Label>
                <Input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                取消
              </Button>
              <Button type="button" onClick={submit} disabled={loading}>
                {loading ? '建立中...' : '確認建立'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
