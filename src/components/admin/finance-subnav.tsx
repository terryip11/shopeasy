import Link from 'next/link';
import { cn } from '@/lib/utils';
import { financeHref } from '@/lib/finance/month-bounds';

type FinanceHref =
  | '/admin/finance'
  | '/admin/revenue'
  | '/admin/finance/merchants'
  | '/admin/finance/payout-overdue'
  | '/admin/finance/reconciliation'
  | '/admin/finance/platform-payout';

const LINKS: { href: FinanceHref; label: string }[] = [
  { href: '/admin/finance', label: '總覽' },
  { href: '/admin/revenue', label: '訂閱收入' },
  { href: '/admin/finance/merchants', label: '訂單分錄' },
  { href: '/admin/finance/payout-overdue', label: '逾期未付' },
  { href: '/admin/finance/reconciliation', label: '月結對帳' },
  { href: '/admin/finance/platform-payout', label: '平台收款' },
];

type Props = {
  active: FinanceHref;
  monthParam?: string;
};

export function FinanceSubnav({ active, monthParam }: Props) {
  return (
    <nav className="-mx-4 border-b border-gray-200 px-4 pb-3 dark:border-gray-800 sm:mx-0 sm:px-0">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={financeHref(item.href, monthParam)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === item.href
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
