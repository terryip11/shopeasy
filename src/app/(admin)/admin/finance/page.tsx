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
  MONETIZATION_MODE_LABELS,
  PAYOUT_MODEL_LABELS,
  LOCKED_PLATFORM_MONETIZATION,
} from '@/lib/finance/monetization';
import { getSubscriptionRevenueStats } from '@/lib/merchant/subscription';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { parseMonthParam, financeHref } from '@/lib/finance/month-bounds';
import {
  DollarSign,
  Receipt,
  Wallet,
  Server,
  Crown,
  Users,
  AlertTriangle,
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
  await syncLedgerStripeFees();

  const [overview, stats, subscription] = await Promise.all([
    getFinanceOverview(month),
    getFinanceDashboardStats(month),
    getSubscriptionRevenueStats(month),
  ]);
  const monthKey = bounds.monthKey;
  const monetizationLabel = `${MONETIZATION_MODE_LABELS[LOCKED_PLATFORM_MONETIZATION.mode]} · ${PAYOUT_MODEL_LABELS[LOCKED_PLATFORM_MONETIZATION.payoutModel]}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">財務總覽</h1>
          <p className="mt-1 text-sm text-gray-500">
            平台收入以商家訂閱月費為主；訂單貨款由買家直付商家，不抽取訂單利潤。
          </p>
          <p className="mt-1 text-xs text-gray-400">
            目前模式：{monetizationLabel}
            {' · '}
            <Link href="/admin/monetization" className="text-orange-600 hover:underline">
              收費說明
            </Link>
          </p>
        </div>
      </div>

      <FinanceSubnav active="/admin/finance" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              訂閱收入（{bounds.monthLabel}）
            </h2>
            <p className="mt-1 text-sm text-gray-500">商家等級月費為平台主要收入來源</p>
          </div>
          <Link
            href={financeHref('/admin/revenue', bounds.monthParam)}
            className="text-sm font-medium text-orange-600 hover:underline"
          >
            訂閱明細與月費設定 →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewTile
            label="本月訂閱收入"
            value={subscription.monthRevenue}
            sub={`${bounds.monthLabel}已入帳`}
            accent
          />
          <OverviewTile
            label="累計訂閱收入"
            value={subscription.totalRevenue}
            sub="歷史合計"
          />
          <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              高級訂閱中
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {subscription.activePremium}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Crown className="h-3.5 w-3.5" />
              尊貴訂閱中
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {subscription.activeVip}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">營運對帳（非平台抽成）</h2>
        <p className="mt-1 text-xs text-gray-500">
          GMV 與配送工資僅供規模／對帳參考；貨款與工資不經平台代收代付。
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-orange-50 p-5 dark:bg-orange-900/20">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <p className="mt-2 text-2xl font-bold text-orange-700 dark:text-orange-400">
              HK${stats.monthGmv.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{bounds.monthLabel} GMV</p>
            <p className="mt-1 text-xs text-gray-500">{stats.monthOrderCount} 筆已記帳</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-5 dark:bg-blue-900/20">
            <Receipt className="h-5 w-5 text-blue-600" />
            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
              HK${stats.monthStripeFees.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">訂單 Stripe 手續費</p>
            <p className="mt-1 text-xs text-gray-500">僅卡款單；線下為 0</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow dark:bg-gray-900">
            <Wallet className="h-5 w-5 text-violet-600" />
            <p className="mt-2 text-2xl font-bold text-violet-700 dark:text-violet-400">
              HK${overview.monthCourierPayable.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">本月配送員實收</p>
            <p className="mt-1 text-xs text-gray-500">商家 FPS 直付</p>
          </div>
          <Link
            href="/admin/finance/payout-overdue"
            className="rounded-xl border border-amber-200 bg-amber-50 p-5 transition hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/40"
          >
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="mt-2 text-base font-semibold text-amber-950 dark:text-amber-100">
              逾期未付跟進
            </p>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
              商家未付分享員／配送員 → 催付與限制配送
            </p>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
        <p className="font-medium text-gray-900 dark:text-white">結算說明</p>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          買家貨款直付商家；分享員佣金與配送員工資由商家直付並標記已付。平台不代墊、不抽訂單
          GMV。本月線下單 {stats.monthManualOrderCount} 筆。
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
          <h2 className="font-semibold">最近訂單分錄（對帳參考）</h2>
          <p className="mt-1 text-xs text-gray-500">
            「分錄淨額」非平台代付金額。
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
              <th className="px-6 py-3">訂單</th>
              <th className="px-6 py-3">商家</th>
              <th className="px-6 py-3">付款</th>
              <th className="px-6 py-3">GMV</th>
              <th className="px-6 py-3">Stripe</th>
              <th className="px-6 py-3">配送成本</th>
              <th className="px-6 py-3">分錄淨額</th>
              <th className="px-6 py-3">時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentLedger.length > 0 ? (
              stats.recentLedger.map((row) => (
                <tr
                  key={row.id}
                  className={row.settlement_status === 'reversed' ? 'opacity-50' : ''}
                >
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${row.order_id}`}
                      className="text-orange-600 hover:underline"
                    >
                      #{row.order_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{row.merchant_name}</td>
                  <td className="px-6 py-4">{paymentLabel(row.payment_method)}</td>
                  <td className="px-6 py-4">HK${row.gmv.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.stripe_fee.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.delivery_cost.toFixed(2)}</td>
                  <td className="px-6 py-4">HK${row.merchant_net.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(row.paid_at).toLocaleString('zh-HK')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  尚無分錄。訂單付款成功後會自動寫入。
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
}: {
  label: string;
  value: number;
  sub: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        accent ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-900 dark:text-white'
        }`}
      >
        HK${value.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}
