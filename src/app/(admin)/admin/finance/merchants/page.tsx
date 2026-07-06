import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import { getMerchantSettlementView } from '@/lib/finance/merchant-settlement';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { parseMonthParam, financeHref } from '@/lib/finance/month-bounds';
import { MERCHANT_TIER_LABELS } from '@/lib/merchant/tier-config';
import type { MerchantTier } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function FinanceMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  const { month } = await searchParams;
  const bounds = parseMonthParam(month);
  const view = await getMerchantSettlementView(month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商家應付彙總</h1>
        <p className="mt-1 text-sm text-gray-500">
          {view.monthLabel}各商家訂單分錄彙總 · 應付商家 = GMV − Stripe − 服務費 − 基礎設施分攤
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/merchants" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="訂單數" value={String(view.totals.order_count)} />
        <Stat label="GMV 合計" value={`HK$${view.totals.gmv.toFixed(2)}`} />
        <Stat label="平台服務費" value={`HK$${view.totals.platform_fee.toFixed(2)}`} accent />
        <Stat label="應付商家合計" value={`HK$${view.totals.merchant_net.toFixed(2)}`} highlight />
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商家</TableHead>
              <TableHead>等級</TableHead>
              <TableHead className="text-right">訂單</TableHead>
              <TableHead className="text-right">GMV</TableHead>
              <TableHead className="text-right">Stripe</TableHead>
              <TableHead className="text-right">服務費</TableHead>
              <TableHead className="text-right">配送成本</TableHead>
              <TableHead className="text-right">應付商家</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.length > 0 ? (
              view.rows.map((row) => (
                <TableRow key={row.merchant_id}>
                  <TableCell className="font-medium">{row.merchant_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {MERCHANT_TIER_LABELS[row.tier as MerchantTier] || row.tier}
                  </TableCell>
                  <TableCell className="text-right">{row.order_count}</TableCell>
                  <TableCell className="text-right">HK${row.gmv.toFixed(2)}</TableCell>
                  <TableCell className="text-right">HK${row.stripe_fee.toFixed(2)}</TableCell>
                  <TableCell className="text-right">HK${row.platform_fee.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-gray-500">
                    HK${row.delivery_cost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    HK${row.merchant_net.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                  本月尚無訂單分錄
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-gray-500">
        配送成本為商家每單配送費參考，已記入分錄但不從商家應得扣款。明細請至
        <Link
          href={financeHref('/admin/finance', bounds.monthParam)}
          className="mx-1 text-orange-600 hover:underline"
        >
          財務總覽
        </Link>
        查看訂單分錄。
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
              ? 'text-green-700 dark:text-green-400'
              : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
