import Link from 'next/link';
import { getSubscriptionRevenueStats, subscriptionPaymentChannelLabel } from '@/lib/merchant/subscription';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import { redirect } from 'next/navigation';
import { MERCHANT_TIER_LABELS } from '@/lib/merchant/tier-config';
import { formatTierPriceSummary, getTierMonthlyPrices } from '@/lib/merchant/tier-pricing';
import { getTierLimits } from '@/lib/merchant/tier-limits';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { AdminMerchantTierPricingForm } from '@/components/admin/admin-merchant-tier-pricing-form';
import { AdminMerchantTierLimitsForm } from '@/components/admin/admin-merchant-tier-limits-form';
import { parseMonthParam } from '@/lib/finance/month-bounds';
import {
  DollarSign,
  TrendingUp,
  Users,
  Crown,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatPeriodEnd(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('zh-HK');
}

function daysLabel(days: number | null) {
  if (days == null) return '—';
  if (days < 0) return `已過期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `剩餘 ${days} 天`;
}

export default async function AdminRevenuePage({
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
  const [stats, tierPrices, tierLimits] = await Promise.all([
    getSubscriptionRevenueStats(month),
    getTierMonthlyPrices(),
    getTierLimits(),
  ]);
  const canEditPricing = isSuperAdmin(role);
  const distTotal =
    stats.tierDistribution.basic +
    stats.tierDistribution.premium +
    stats.tierDistribution.vip;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">訂閱收入</h1>
        <p className="mt-1 text-sm text-gray-500">
          商家等級月費收入（{formatTierPriceSummary(tierPrices)}）· 平台主要收入來源
        </p>
      </div>

      <FinanceSubnav active="/admin/revenue" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      {stats.pendingUpgradeCount > 0 && (
        <Link
          href="/admin/merchants/tier-upgrades"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">有 {stats.pendingUpgradeCount} 筆 FPS 升級待核對</p>
              <p className="mt-0.5 text-sm opacity-80">商家已回報付款，請確認到帳後開通等級。</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            前往確認
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {canEditPricing && (
        <>
          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
            <h2 className="font-semibold text-gray-900 dark:text-white">訂閱月費設定</h2>
            <p className="mt-1 text-sm text-gray-500">
              僅全權管理員可調整。商家在儀表板訂閱時將顯示以下月費。
            </p>
            <div className="mt-4">
              <AdminMerchantTierPricingForm initialPrices={tierPrices} />
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
            <h2 className="font-semibold text-gray-900 dark:text-white">等級能力上限</h2>
            <p className="mt-1 text-sm text-gray-500">
              調整各等級可上架商品數、每件商品圖片數。儲存後立即生效。
            </p>
            <div className="mt-4">
              <AdminMerchantTierLimitsForm initialLimits={tierLimits} />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-green-50 p-6 dark:bg-green-900/20">
          <DollarSign className="h-6 w-6 text-green-600" />
          <p className="mt-3 text-2xl font-bold text-green-700 dark:text-green-400">
            HK${stats.totalRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">累計收入</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <p className="mt-3 text-2xl font-bold text-blue-700 dark:text-blue-400">
            HK${stats.monthRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{bounds.monthLabel}收入</p>
          <p className="mt-2 text-xs text-gray-500">
            新訂 HK${stats.monthInitialRevenue.toFixed(2)}（{stats.monthInitialCount}）· 續訂 HK$
            {stats.monthRenewalRevenue.toFixed(2)}（{stats.monthRenewalCount}）
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
          <Users className="h-6 w-6 text-indigo-600" />
          <p className="mt-3 text-2xl font-bold">{stats.activePremium}</p>
          <p className="text-sm text-gray-500">高級訂閱中</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-6 dark:bg-amber-900/20">
          <Crown className="h-6 w-6 text-amber-600" />
          <p className="mt-3 text-2xl font-bold text-amber-700">{stats.activeVip}</p>
          <p className="text-sm text-gray-500">尊貴訂閱中</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">商家等級分布</h2>
        <p className="mt-1 text-sm text-gray-500">目前各等級商家數（共 {distTotal}）</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
            <p className="text-xs text-gray-500">{MERCHANT_TIER_LABELS.basic}</p>
            <p className="mt-1 text-xl font-semibold">{stats.tierDistribution.basic}</p>
          </div>
          <div className="rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
            <p className="text-xs text-gray-500">{MERCHANT_TIER_LABELS.premium}</p>
            <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-300">
              {stats.tierDistribution.premium}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
            <p className="text-xs text-gray-500">{MERCHANT_TIER_LABELS.vip}</p>
            <p className="mt-1 text-xl font-semibold text-amber-700 dark:text-amber-300">
              {stats.tierDistribution.vip}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <Clock className="h-4 w-4 text-orange-500" />
            <h2 className="font-semibold">14 天內即將到期</h2>
            <span className="ml-auto text-sm text-gray-500">{stats.expiringSoon.length}</span>
          </div>
          {stats.expiringSoon.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">暫無即將到期訂閱</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.expiringSoon.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {MERCHANT_TIER_LABELS[m.tier]} · {subscriptionPaymentChannelLabel(m.channel)} ·
                      到期 {formatPeriodEnd(m.periodEnd)}
                    </p>
                  </div>
                  <span className="text-orange-600 dark:text-orange-400">{daysLabel(m.daysRemaining)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="font-semibold">已過期仍為付費等級</h2>
            <span className="ml-auto text-sm text-gray-500">{stats.expired.length}</span>
          </div>
          {stats.expired.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">暫無過期訂閱</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.expired.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {MERCHANT_TIER_LABELS[m.tier]} · {subscriptionPaymentChannelLabel(m.channel)} ·
                      到期 {formatPeriodEnd(m.periodEnd)}
                    </p>
                  </div>
                  <span className="text-red-600 dark:text-red-400">{daysLabel(m.daysRemaining)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="font-semibold">{bounds.monthLabel}收款記錄</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
              <th className="px-6 py-3">商家</th>
              <th className="px-6 py-3">等級</th>
              <th className="px-6 py-3">金額</th>
              <th className="px-6 py-3">類型</th>
              <th className="px-6 py-3">付款方式</th>
              <th className="px-6 py-3">時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-medium">{p.merchant_name}</td>
                  <td className="px-6 py-4">{MERCHANT_TIER_LABELS[p.tier]}</td>
                  <td className="px-6 py-4">HK${p.amount_hkd.toFixed(2)}</td>
                  <td className="px-6 py-4">{p.payment_type === 'renewal' ? '續訂' : '首次訂閱'}</td>
                  <td className="px-6 py-4">{subscriptionPaymentChannelLabel(p.channel)}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(p.paid_at).toLocaleString('zh-HK')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  尚無訂閱收款記錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
