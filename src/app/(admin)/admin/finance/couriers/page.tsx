import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import { getCourierSettlementView } from '@/lib/finance/courier-settlement';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { parseMonthParam, financeHref } from '@/lib/finance/month-bounds';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function FinanceCouriersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  const { month } = await searchParams;
  const bounds = parseMonthParam(month);
  const view = await getCourierSettlementView(month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">配送員結算彙總</h1>
        <p className="mt-1 text-sm text-gray-500">
          {view.monthLabel}各配送員配送收入 · 平台抽成與應發工資（唯讀）
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/couriers" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="完成配送" value={`${view.totals.delivery_count} 單`} />
        <Stat label="總配送費" value={`HK$${view.totals.gross_total.toFixed(2)}`} />
        <Stat label="平台抽成" value={`HK$${view.totals.platform_fee_total.toFixed(2)}`} accent />
        <Stat label="應發工資合計" value={`HK$${view.totals.courier_net_total.toFixed(2)}`} highlight />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 max-w-lg">
        <Stat label="待結算" value={`HK$${view.totals.pending_net.toFixed(2)}`} />
        <Stat label="已結算" value={`HK$${view.totals.settled_net.toFixed(2)}`} />
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配送員</TableHead>
              <TableHead className="text-right">單數</TableHead>
              <TableHead className="text-right">總配送費</TableHead>
              <TableHead className="text-right">平台抽成</TableHead>
              <TableHead className="text-right">應發工資</TableHead>
              <TableHead className="text-right">待結算</TableHead>
              <TableHead className="text-right">已結算</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.length > 0 ? (
              view.rows.map((row) => (
                <TableRow key={row.courier_id}>
                  <TableCell className="font-medium">{row.display_name}</TableCell>
                  <TableCell className="text-right">{row.delivery_count}</TableCell>
                  <TableCell className="text-right">HK${row.gross_total.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-teal-700 dark:text-teal-400">
                    HK${row.platform_fee_total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    HK${row.courier_net_total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-amber-700 dark:text-amber-400">
                    HK${row.pending_net.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    HK${row.settled_net.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  本月尚無配送記帳
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-gray-500">
        月薪批次結算請至
        <Link
          href={financeHref('/admin/finance', bounds.monthParam)}
          className="mx-1 text-orange-600 hover:underline"
        >
          財務總覽
        </Link>
        操作（需具備財務寫入權限）。
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          highlight
            ? 'text-violet-700 dark:text-violet-400'
            : accent
              ? 'text-teal-700 dark:text-teal-400'
              : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
