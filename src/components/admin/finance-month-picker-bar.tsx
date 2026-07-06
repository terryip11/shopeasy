import { Suspense } from 'react';
import { FinanceMonthPicker } from '@/components/admin/finance-month-picker';
import { listSelectableMonths } from '@/lib/finance/month-bounds';

type Props = {
  monthParam: string;
};

export function FinanceMonthPickerBar({ monthParam }: Props) {
  const options = listSelectableMonths(24).map((m) => ({
    value: m.monthParam,
    label: m.monthLabel,
  }));

  return (
    <Suspense fallback={<div className="h-9" />}>
      <FinanceMonthPicker options={options} currentMonthParam={monthParam} />
    </Suspense>
  );
}
