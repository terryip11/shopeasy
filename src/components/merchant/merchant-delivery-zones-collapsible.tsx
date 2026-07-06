'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Zone = {
  id: string;
  name: string;
  region: string | null;
};

const REGION_ORDER = ['港島', '九龍', '新界'] as const;

export function MerchantDeliveryZonesCollapsible({ zones }: { zones: Zone[] }) {
  const [open, setOpen] = useState(false);

  const { groups, other, summary } = useMemo(() => {
    const groups = REGION_ORDER.map((region) => ({
      region,
      zones: zones.filter((z) => z.region === region),
    })).filter((g) => g.zones.length > 0);
    const other = zones.filter(
      (z) => !z.region || !REGION_ORDER.includes(z.region as (typeof REGION_ORDER)[number])
    );
    const parts = groups.map((g) => `${g.region} ${g.zones.length} 區`);
    if (other.length > 0) parts.push(`其他 ${other.length} 區`);
    const summary =
      zones.length > 0 ? `共 ${zones.length} 個區域（${parts.join('、')}）` : '尚未設定';
    return { groups, other, summary };
  }, [zones]);

  if (zones.length === 0) {
    return (
      <div className="space-y-2">
        <Label>支援配送區域</Label>
        <p className="text-sm text-gray-500">
          尚未設定配送區域，請在 Supabase 執行 migrate-v5-delivery.sql
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>支援配送區域</Label>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex min-w-0 items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{summary}</p>
          </div>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="max-h-64 space-y-3 overflow-y-auto border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            {groups.map(({ region, zones: list }) => (
              <div key={region}>
                <p className="text-xs font-semibold text-gray-500">{region}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {list.map((zone) => (
                    <span
                      key={zone.id}
                      className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {zone.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {other.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500">其他</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {other.map((zone) => (
                    <span
                      key={zone.id}
                      className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {zone.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">由平台統一設定，買家結帳時可選上述區域</p>
    </div>
  );
}
