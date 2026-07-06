import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { CourierEarningItem } from '@/lib/finance/courier-earnings-view';

const STATUS_LABELS: Record<CourierEarningItem['settlement_status'], string> = {
  pending: '待結算',
  settled: '已結算',
  reversed: '已沖銷',
};

const STATUS_STYLES: Record<CourierEarningItem['settlement_status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  settled: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  reversed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

type Props = {
  items: CourierEarningItem[];
};

export function CourierEarningsList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">尚無配送收入紀錄</p>
        <p className="mt-1 text-xs text-gray-400">完成送達後會自動記入待結算</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">
                {JOB_TYPE_LABELS[item.job_type as keyof typeof JOB_TYPE_LABELS] || item.job_type}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {new Date(item.earned_at).toLocaleString('zh-HK', {
                  timeZone: 'Asia/Hong_Kong',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · 訂單 #'}
                {item.order_id.slice(0, 8)}
              </p>
              {item.rating_surcharge != null && item.rating_surcharge > 0 && (
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  基本 HK${(item.base_amount ?? (item.gross_amount ?? item.amount) - item.rating_surcharge).toFixed(0)}
                  {' + 高評加價 HK$'}
                  {item.rating_surcharge.toFixed(0)}
                </p>
              )}
              {item.platform_fee_amount != null && item.platform_fee_amount > 0 ? (
                <p className="mt-0.5 text-xs text-gray-500">
                  總配送費 HK${(item.gross_amount ?? item.amount + item.platform_fee_amount).toFixed(0)}
                  {' · 平台服務費 HK$'}
                  {item.platform_fee_amount.toFixed(0)}
                </p>
              ) : item.gross_amount != null && item.gross_amount > item.amount ? (
                <p className="mt-0.5 text-xs text-gray-500">
                  總配送費 HK${item.gross_amount.toFixed(0)}
                  {' · 平台服務費 HK$'}
                  {(item.gross_amount - item.amount).toFixed(0)}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-bold text-gray-900 dark:text-white">
                HK${item.amount.toFixed(0)}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.settlement_status]}`}
              >
                {STATUS_LABELS[item.settlement_status]}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
