import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getFinanceDashboardStats } from '@/lib/finance/stats';
import { syncLedgerStripeFees } from '@/lib/finance/ledger';
import { getFinanceOverview } from '@/lib/finance/overview';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import { FinanceMonthlyCostsForm } from '@/components/admin/finance-monthly-costs-form';
import { FinanceBackfillButton } from '@/components/admin/finance-backfill-button';
import { PAYMENT_METHOD_META, type MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import {
  PLATFORM_FEE_RATE_BY_TIER,
  COURIER_PAYROLL_DAY,
} from '@/lib/finance/config';
import { getCourierPayrollPreview, getCourierPayrollStats } from '@/lib/finance/courier-payroll';
import { getCourierPlatformFeeRevenueStats } from '@/lib/finance/courier-platform-revenue';
import { FinanceCourierPayrollPanel } from '@/components/admin/finance-courier-payroll-panel';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { parseMonthParam, financeHref, currentMonthBounds } from '@/lib/finance/month-bounds';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  Server,
  ArrowLeft,
  Truck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function paymentLabel(method: string) {
  if (method in PAYMENT_METHOD_META) {
    return PAYMENT_METHOD_META[method as MerchantPaymentMethod].label;
  }
  return method;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const role = await getUserRole();
  if (!canManageFinance(role)) {
    redirect('/admin');
  }

  const { month } = await searchParams;
  const bounds = parseMonthParam(month);

  const payrollPeriod = bounds.monthKey;
  await syncLedgerStripeFees();
  const [overview, stats, payrollPreview, courierPayrollStats, courierPlatformRevenue] =
    await Promise.all([
      getFinanceOverview(month),
      getFinanceDashboardStats(month),
      getCourierPayrollPreview(payrollPeriod),
      getCourierPayrollStats(),
      getCourierPlatformFeeRevenueStats(month),
    ]);
  const monthKey = bounds.monthKey;
  const isCurrentMonth = bounds.monthParam === currentMonthBounds().monthParam;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">交易財務</h1>
          <p className="mt-1 text-sm text-gray-500">
            訂單 GMV、商家服務費、配送員工資與配送平台抽成
          </p>
        </div>
        <Link
          href={financeHref('/admin/revenue', bounds.monthParam)}
          className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          訂閱收入（月費）
        </Link>
      </div>

      <FinanceSubnav active="/admin/finance" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm dark:border-indigo-900 dark:from-indigo-950/30 dark:to-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          平台收入總覽（{bounds.monthLabel}）
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          會計一站式查看各類平台收入與應付款項；訂單明細見下方分錄，訂閱見
          <Link href={financeHref('/admin/revenue', bounds.monthParam)} className="mx-1 text-orange-600 hover:underline">
            訂閱收入
          </Link>
          頁。
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewTile
            label="平台收入合計"
            value={overview.monthPlatformRevenue}
            sub={`${overview.monthOrderCount} 筆訂單 · ${overview.monthDeliveryCount} 單配送`}
            accent
          />
          <OverviewTile
            label="商家服務費（GMV）"
            value={overview.monthMerchantServiceFee}
            sub="依商家等級抽成"
          />
          <OverviewTile
            label="配送平台抽成"
            value={overview.monthCourierPlatformFee}
            sub="從配送員總配送費抽取"
          />
          <OverviewTile
            label="訂閱月費"
            value={overview.monthSubscriptionRevenue}
            sub={
              <Link href={financeHref('/admin/revenue', bounds.monthParam)} className="text-orange-600 hover:underline">
                查看訂閱明細 →
              </Link>
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-indigo-100 pt-4 sm:grid-cols-3 dark:border-indigo-900">
          <OverviewTile
            label="本月 Stripe 手續費"
            value={overview.monthStripeFees}
            sub="僅卡款訂單；線下付款為 0"
            muted
          />
          <OverviewTile
            label="本月應付商家"
            value={overview.monthMerchantPayable}
            sub="GMV − Stripe − 服務費 − 基礎設施分攤"
            muted
          />
          <OverviewTile
            label="待發配送員工資"
            value={overview.pendingCourierPayroll}
            sub={`本月配送員實收 HK$${overview.monthCourierPayable.toFixed(2)}`}
            muted
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-orange-50 p-6 dark:bg-orange-900/20">
          <DollarSign className="h-6 w-6 text-orange-600" />
          <p className="mt-3 text-2xl font-bold text-orange-700 dark:text-orange-400">
            HK${stats.monthGmv.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{bounds.monthLabel} GMV</p>
          <p className="mt-1 text-xs text-gray-500">{stats.monthOrderCount} 筆已記帳</p>
        </div>
        <div className="rounded-xl bg-green-50 p-6 dark:bg-green-900/20">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <p className="mt-3 text-2xl font-bold text-green-700 dark:text-green-400">
            HK${stats.monthPlatformFees.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{bounds.monthLabel}商家服務費（GMV）</p>
          <p className="mt-1 text-xs text-gray-500">
            累計 HK${stats.allTimePlatformFees.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <Receipt className="h-6 w-6 text-blue-600" />
          <p className="mt-3 text-2xl font-bold text-blue-700 dark:text-blue-400">
            HK${stats.monthStripeFees.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{bounds.monthLabel} Stripe 手續費（訂單）</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
          <Wallet className="h-6 w-6 text-violet-600" />
          <p className="mt-3 text-2xl font-bold text-violet-700 dark:text-violet-400">
            HK${courierPayrollStats.pendingTotal.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">待發配送員工資</p>
          <p className="mt-1 text-xs text-gray-500">
            {courierPayrollStats.pendingCount} 單待結算
            {!isCurrentMonth && '（全系統即時）'}
          </p>
        </div>
      </div>

      <FinanceCourierPayrollPanel preview={payrollPreview} />

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            <h2 className="font-semibold">配送平台抽成收入</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            從配送員每單總配送費中抽取的平台服務費（與上方「商家服務費」分開計算）
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-gray-100 p-6 sm:grid-cols-3 dark:border-gray-800">
          <div className="rounded-lg bg-teal-50 p-4 dark:bg-teal-900/20">
            <p className="text-sm text-gray-500">本月配送平台抽成</p>
            <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-400">
              HK${courierPlatformRevenue.monthPlatformFee.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              累計 HK${courierPlatformRevenue.allTimePlatformFee.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500">本月總配送費</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              HK${courierPlatformRevenue.monthGrossDelivery.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {courierPlatformRevenue.monthDeliveryCount} 單完成配送
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500">本月應付配送員（實收）</p>
            <p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-400">
              HK${courierPlatformRevenue.monthCourierNet.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-500">總配送費 − 平台抽成</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
              <th className="px-6 py-3">訂單</th>
              <th className="px-6 py-3">類型</th>
              <th className="px-6 py-3">總配送費</th>
              <th className="px-6 py-3">平台抽成</th>
              <th className="px-6 py-3">配送員實收</th>
              <th className="px-6 py-3">狀態</th>
              <th className="px-6 py-3">送達時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {courierPlatformRevenue.recent.length > 0 ? (
              courierPlatformRevenue.recent.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/admin/orders/${row.order_id}`} className="text-orange-600 hover:underline">
                      #{row.order_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {JOB_TYPE_LABELS[row.job_type as keyof typeof JOB_TYPE_LABELS] || row.job_type}
                  </td>
                  <td className="px-6 py-4">HK${row.gross_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium text-teal-700 dark:text-teal-400">
                    HK${row.platform_fee_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">HK${row.courier_net.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {row.settlement_status === 'pending'
                      ? '待結算'
                      : row.settlement_status === 'settled'
                        ? '已結算'
                        : row.settlement_status}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(row.earned_at).toLocaleString('zh-HK')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  尚無配送記帳。配送完成後會自動寫入。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
        <p className="font-medium text-gray-900 dark:text-white">服務費與結算規則</p>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          平台服務費依商家等級：普通 {(PLATFORM_FEE_RATE_BY_TIER.basic * 100).toFixed(0)}%、
          高級 {(PLATFORM_FEE_RATE_BY_TIER.premium * 100).toFixed(1)}%、
          尊貴 {(PLATFORM_FEE_RATE_BY_TIER.vip * 100).toFixed(0)}%（以 GMV 計）。
          商家應得 = GMV − Stripe 費 − 服務費 − 基礎設施分攤（全款收取訂單款，不扣配送費）。
        </p>
        <p className="mt-2 text-xs text-gray-500">
          配送員每單工資由商家在店鋪設置中自訂；平台另從總配送費抽取比例作為配送平台抽成（見上方區塊）。
          配送完成後記帳，建議每月 {COURIER_PAYROLL_DAY} 號結算上月工資。
          本月線下單 {stats.monthManualOrderCount} 筆。
        </p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Stripe 手續費：僅「卡款（Stripe）」訂單計入。開發環境用「標記已付款」會以香港卡費率（2.9% + HK$2.35）估算；
          轉數快／微信／支付寶等線下付款手續費為 0。Stripe 測試模式真實結帳會嘗試讀取實際費用，失敗則同樣估算。
        </p>
        <div className="mt-3">
          <FinanceBackfillButton />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold">本月固定成本</h2>
        </div>
        <FinanceMonthlyCostsForm month={monthKey} initial={stats.monthlyCosts} />
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="font-semibold">最近訂單分錄</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
              <th className="px-6 py-3">訂單</th>
              <th className="px-6 py-3">商家</th>
              <th className="px-6 py-3">付款</th>
              <th className="px-6 py-3">GMV</th>
              <th className="px-6 py-3">Stripe</th>
              <th className="px-6 py-3">服務費</th>
              <th className="px-6 py-3">配送成本</th>
              <th className="px-6 py-3">應付商家</th>
              <th className="px-6 py-3">時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentLedger.length > 0 ? (
              stats.recentLedger.map((row) => (
                <tr key={row.id} className={row.settlement_status === 'reversed' ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/admin/orders/${row.order_id}`} className="text-orange-600 hover:underline">
                      #{row.order_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{row.merchant_name}</td>
                  <td className="px-6 py-4">{paymentLabel(row.payment_method)}</td>
                  <td className="px-6 py-4">HK${row.gmv.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.stripe_fee.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.platform_fee_amount.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.delivery_cost.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.merchant_net.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(row.paid_at).toLocaleString('zh-HK')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  尚無分錄。訂單付款成功（Stripe webhook 或開發標記已付）後會自動寫入。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewTile({
  label,
  value,
  sub,
  accent,
  muted,
}: {
  label: string;
  value: number;
  sub: ReactNode;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        accent
          ? 'bg-indigo-100 dark:bg-indigo-900/40'
          : muted
            ? 'bg-white/60 dark:bg-gray-800/60'
            : 'bg-white dark:bg-gray-800'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
        }`}
      >
        HK${value.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}
