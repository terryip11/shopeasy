import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { MerchantPayoutCompliance } from '@/lib/merchant/payout-compliance';

type Props = {
  compliance: Pick<
    MerchantPayoutCompliance,
    'level' | 'message' | 'deliveryBlocked' | 'pendingAmount' | 'remindDays' | 'blockDays'
  >;
};

export function MerchantPayoutOverdueBanner({ compliance }: Props) {
  if (compliance.level === 'ok' || !compliance.message) return null;

  const blocked = compliance.level === 'block' || compliance.deliveryBlocked;
  return (
    <div
      className={
        blocked
          ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">
            {blocked ? '配送已因逾期未付暫停' : '應付佣金／工資催付提醒'}
          </p>
          <p className="text-sm opacity-90">{compliance.message}</p>
          <p className="text-xs opacity-75">
            提醒門檻 {compliance.remindDays} 天 · 限制門檻 {compliance.blockDays} 天
            {compliance.pendingAmount > 0
              ? ` · 待付合計 HK$${compliance.pendingAmount.toFixed(2)}`
              : ''}
          </p>
          <Link
            href="/dashboard/payables"
            className="inline-block pt-1 text-sm font-semibold underline underline-offset-2"
          >
            前往應付佣金／工資
          </Link>
        </div>
      </div>
    </div>
  );
}
