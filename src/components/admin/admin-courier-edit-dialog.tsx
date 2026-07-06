'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { AdminCourierRow, AdminDeliveryZoneRow } from '@/lib/admin/couriers';
import type { UserCapability } from '@/lib/auth/capabilities';

const REGIONS = ['港島', '九龍', '新界'] as const;

type Props = {
  courier: AdminCourierRow;
  zones: AdminDeliveryZoneRow[];
};

export function AdminCourierEditDialog({ courier, zones }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zoneIds, setZoneIds] = useState<string[]>(courier.zone_ids);
  const [food, setFood] = useState(courier.capabilities.includes('food_courier'));
  const [parcel, setParcel] = useState(courier.capabilities.includes('parcel_courier'));
  const [status, setStatus] = useState<'active' | 'suspended'>(
    courier.status === 'suspended' ? 'suspended' : 'active'
  );

  const zonesByRegion = useMemo(() => {
    const map = new Map<string, AdminDeliveryZoneRow[]>();
    for (const region of REGIONS) map.set(region, []);
    for (const z of zones) {
      const key = z.region && REGIONS.includes(z.region as (typeof REGIONS)[number]) ? z.region : '其他';
      const list = map.get(key) ?? [];
      list.push(z);
      map.set(key, list);
    }
    return map;
  }, [zones]);

  const toggleZone = (id: string) => {
    setZoneIds((prev) => (prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]));
  };

  const openDialog = () => {
    setZoneIds(courier.zone_ids);
    setFood(courier.capabilities.includes('food_courier'));
    setParcel(courier.capabilities.includes('parcel_courier'));
    setStatus(courier.status === 'suspended' ? 'suspended' : 'active');
    setOpen(true);
  };

  const save = async () => {
    if (zoneIds.length === 0) {
      alert('請至少選擇一個服務區域');
      return;
    }
    if (!food && !parcel) {
      alert('請至少選擇一種配送類型');
      return;
    }

    const job_types: ('food' | 'parcel')[] = [];
    if (food) job_types.push('food');
    if (parcel) job_types.push('parcel');

    setLoading(true);
    const res = await fetch(`/api/admin/couriers/${courier.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_ids: zoneIds, status, job_types }),
    });
    setLoading(false);

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '儲存失敗');
    }
  };

  const capLabel = (caps: UserCapability[]) =>
    caps
      .filter((c) => c === 'food_courier' || c === 'parcel_courier')
      .map((c) => (c === 'food_courier' ? JOB_TYPE_LABELS.food : JOB_TYPE_LABELS.parcel))
      .join('、') || '—';

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={openDialog}>
        調整
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">調整配送員</h3>
            <p className="mt-1 text-sm text-gray-500">
              {courier.display_name || courier.user_id.slice(0, 8)} · 目前{' '}
              {capLabel(courier.capabilities)}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Label>帳號狀態</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="active">啟用</option>
                  <option value="suspended">停用</option>
                </select>
              </div>

              <div>
                <Label>配送類型</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={food} onChange={(e) => setFood(e.target.checked)} />
                    {JOB_TYPE_LABELS.food}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={parcel}
                      onChange={(e) => setParcel(e.target.checked)}
                    />
                    {JOB_TYPE_LABELS.parcel}
                  </label>
                </div>
              </div>

              <div>
                <Label>服務區域 *</Label>
                <p className="mt-1 text-xs text-gray-500">僅顯示所選區域內的待接單任務</p>
                <div className="mt-2 max-h-56 space-y-3 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  {REGIONS.map((region) => {
                    const list = zonesByRegion.get(region) ?? [];
                    if (list.length === 0) return null;
                    return (
                      <div key={region}>
                        <p className="text-xs font-semibold text-gray-500">{region}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {list.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              onClick={() => toggleZone(z.id)}
                              className={`rounded-lg border px-2.5 py-1 text-xs ${
                                zoneIds.includes(z.id)
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-gray-200 text-gray-600 dark:border-gray-700'
                              }`}
                            >
                              {z.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                取消
              </Button>
              <Button type="button" onClick={() => void save()} disabled={loading}>
                {loading ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
