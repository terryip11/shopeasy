import Link from 'next/link';
import { Wallet, ChevronRight, Star } from 'lucide-react';
import type { CourierEarningsSummary } from '@/lib/finance/courier-earnings-view';
import { cn } from '@/lib/utils';

type Props = {
  summary: CourierEarningsSummary;
  jobType?: 'food' | 'parcel';
  className?: string;
};

const ACCENT = {
  food: 'border-amber-200 from-amber-50 dark:border-amber-900 dark:from-amber-950/40',
  parcel: 'border-sky-200 from-sky-50 dark:border-sky-900 dark:from-sky-950/40',
};

export function CourierEarningsSummaryCard({ summary, jobType = 'parcel', className }: Props) {
  const accent = ACCENT[jobType];

  return (
    <Link
      href="/courier/earnings"
      className={cn(
        'block rounded-2xl border bg-gradient-to-br to-white p-4 shadow-sm transition-shadow hover:shadow-md dark:to-gray-900',
        accent,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">我的收入</p>
            <p className="text-xs text-gray-500">送達後記入 · 每月結算</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="今日已完成" value={`HK$${summary.todayAmount.toFixed(0)}`} sub={`${summary.todayCount} 單`} />
        <Stat
          label="本月待結算"
          value={`HK$${summary.monthPendingAmount.toFixed(0)}`}
          sub={`${summary.monthPendingCount} 單`}
          highlight
        />
      </div>

      {(summary.customerRatingCount > 0 && summary.customerRatingAvg != null) ||
      summary.lastSettledAmount != null ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-200/80 pt-3 text-xs text-gray-500 dark:border-gray-700">
          {summary.customerRatingCount > 0 && summary.customerRatingAvg != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              客戶評分 {summary.customerRatingAvg.toFixed(1)}（{summary.customerRatingCount} 則）
            </span>
          )}
          {summary.lastSettledAmount != null && summary.lastSettledLabel && (
            <span>
              {summary.lastSettledLabel}已結算 HK${summary.lastSettledAmount.toFixed(0)}
            </span>
          )}
        </div>
      ) : null}
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-bold',
          highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
