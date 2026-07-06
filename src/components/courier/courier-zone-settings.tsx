'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import { cn } from '@/lib/utils';

type Zone = {
  id: string;
  name: string;
  region: string | null;
};

const REGION_ORDER = ['港島', '九龍', '新界'] as const;

type Props = {
  zones: Zone[];
  selectedZoneIds: string[];
  jobType: DeliveryJobType;
};

export function CourierZoneSettings({ zones, selectedZoneIds, jobType }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zoneIds, setZoneIds] = useState(selectedZoneIds);
  const [loading, setLoading] = useState(false);

  const zonesByRegion = useMemo(() => {
    const groups = REGION_ORDER.map((region) => ({
      region,
      zones: zones.filter((z) => z.region === region),
    })).filter((g) => g.zones.length > 0);
    const other = zones.filter(
      (z) => !z.region || !REGION_ORDER.includes(z.region as (typeof REGION_ORDER)[number])
    );
    return { groups, other };
  }, [zones]);

  const selectedNames = useMemo(
    () =>
      zoneIds
        .map((id) => zones.find((z) => z.id === id)?.name)
        .filter(Boolean)
        .join('、'),
    [zoneIds, zones]
  );

  const toggleZone = (id: string) => {
    setZoneIds((prev) => (prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]));
  };

  const save = async () => {
    if (zoneIds.length === 0) {
      alert('請至少選擇一個服務區域');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/courier/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_ids: zoneIds }),
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

  const accentSelected =
    jobType === 'food'
      ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/20'
      : 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/20';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => {
          if (!open) setZoneIds(selectedZoneIds);
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">服務區域</p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {selectedNames || '尚未設定'} · 點擊調整接單範圍
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
          <p className="text-xs text-gray-500">僅會顯示所選區域內的待接單任務，可隨時調整。</p>
          <div className="mt-3 space-y-3">
            {zonesByRegion.groups.map(({ region, zones: list }) => (
              <div key={region}>
                <p className="text-xs font-semibold text-gray-500">{region}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {list.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                        zoneIds.includes(zone.id)
                          ? accentSelected
                          : 'border-gray-200 text-gray-600 dark:border-gray-700'
                      )}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {zonesByRegion.other.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500">其他</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {zonesByRegion.other.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                        zoneIds.includes(zone.id) ? accentSelected : 'border-gray-200 text-gray-600'
                      )}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="button" className="flex-1" onClick={() => void save()} disabled={loading}>
              {loading ? '儲存中...' : '儲存區域'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
