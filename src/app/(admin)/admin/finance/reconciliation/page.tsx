import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import { getFinanceReconciliationView } from '@/lib/finance/reconciliation';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { parseMonthParam, financeHref } from '@/lib/finance/month-bounds';
import { FinanceMonthlyCostsForm } from '@/components/admin/finance-monthly-costs-form';

export const dynamic = 'force-dynamic';

export default async function FinanceReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  const { month } = await searchParams;
  const bounds = parseMonthParam(month);
  const view = await getFinanceReconciliationView(month);
  const monthKey = bounds.monthKey;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">月結對帳</h1>
        <p className="mt-1 text-sm text-gray-500">
          {view.monthLabel}平台收入、成本與應付款項一覽
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/reconciliation" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 dark:border-indigo-900 dark:bg-indigo-950/20">
        <p className="text-sm text-gray-500">本月營運結餘（收入 − 成本）</p>
        <p
          className={`mt-1 text-3xl font-bold ${
            view.operatingSurplus >= 0
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          HK${view.operatingSurplus.toFixed(2)}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          不含應付商家／配送員（屬負債）；固定成本請於下方填寫實際帳單金額。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="平台收入">
          <Line label="商家服務費（GMV）" amount={view.revenue.merchantServiceFee} positive />
          <Line label="配送平台抽成" amount={view.revenue.courierPlatformFee} positive />
          <Line label="訂閱月費" amount={view.revenue.subscriptionRevenue} positive />
          <Line label="收入合計" amount={view.revenue.total} positive bold />
        </Section>

        <Section title="成本與費用">
          <Line label="Stripe 手續費（訂單卡款）" amount={view.costs.stripeFees} />
          <Line label="基礎設施分攤（訂單）" amount={view.costs.infraAllocated} />
          <Line label="Supabase 固定成本" amount={view.costs.fixedSupabase} />
          <Line label="R2 固定成本" amount={view.costs.fixedR2} />
          <Line label="Stripe 帳單回報" amount={view.costs.fixedStripeReported} />
          <Line label="其他固定成本" amount={view.costs.fixedOther} />
          <Line label="成本合計" amount={view.costs.total} bold />
        </Section>

        <Section title="應付款項（負債）">
          <Line
            label="應付商家"
            amount={view.liabilities.merchantPayable}
            href={financeHref('/admin/finance/merchants', bounds.monthParam)}
          />
          <Line
            label="待發配送員工資"
            amount={view.liabilities.courierPendingPayroll}
            href={financeHref('/admin/finance/couriers', bounds.monthParam)}
          />
          <Line label="應付合計" amount={view.liabilities.total} bold />
        </Section>

        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">本月固定成本設定</h2>
          <p className="mt-1 text-sm text-gray-500">
            填入雲服務與 Stripe 實際帳單，用於對帳計算
          </p>
          {view.monthlyCostsNotes && (
            <p className="mt-2 text-xs text-gray-400">備註：{view.monthlyCostsNotes}</p>
          )}
          <div className="mt-4">
            <FinanceMonthlyCostsForm
              month={monthKey}
              initial={{
                supabase_cost: view.costs.fixedSupabase,
                r2_cost: view.costs.fixedR2,
                stripe_fees_reported: view.costs.fixedStripeReported,
                other_cost: view.costs.fixedOther,
                notes: view.monthlyCostsNotes,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function Line({
  label,
  amount,
  positive,
  bold,
  href,
}: {
  label: string;
  amount: number;
  positive?: boolean;
  bold?: boolean;
  href?: string;
}) {
  const value = (
    <span
      className={
        bold
          ? 'font-bold text-gray-900 dark:text-white'
          : positive
            ? 'text-green-700 dark:text-green-400'
            : 'text-gray-700 dark:text-gray-300'
      }
    >
      {positive ? '+' : ''}HK${amount.toFixed(2)}
    </span>
  );

  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'border-t pt-2 mt-2' : ''}`}>
      {href ? (
        <Link href={href} className="text-orange-600 hover:underline">
          {label}
        </Link>
      ) : (
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      )}
      {value}
    </div>
  );
}
