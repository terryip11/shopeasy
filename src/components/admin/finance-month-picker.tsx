'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { currentMonthBounds } from '@/lib/finance/month-bounds';

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  currentMonthParam: string;
};

export function FinanceMonthPicker({ options, currentMonthParam }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = currentMonthBounds().monthParam;
    if (!value || value === current) {
      params.delete('month');
    } else {
      params.set('month', value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="finance-month" className="text-sm text-gray-500">
        查詢月份
      </label>
      <select
        id="finance-month"
        value={currentMonthParam}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
