import { getSubscriptionRevenueStats } from '@/lib/merchant/subscription';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import { redirect } from 'next/navigation';
import { MERCHANT_TIER_LABELS } from '@/lib/merchant/tier-config';
import { formatTierPriceSummary, getTierMonthlyPrices } from '@/lib/merchant/tier-pricing';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { FinanceMonthPickerBar } from '@/components/admin/finance-month-picker-bar';
import { AdminMerchantTierPricingForm } from '@/components/admin/admin-merchant-tier-pricing-form';
import { parseMonthParam } from '@/lib/finance/month-bounds';
import { DollarSign, TrendingUp, Users, Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
  const [stats, tierPrices] = await Promise.all([
    getSubscriptionRevenueStats(month),
    getTierMonthlyPrices(),
  ]);
  const canEditPricing = isSuperAdmin(role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">訂閱收入</h1>
        <p className="mt-1 text-sm text-gray-500">
          商家等級月費收入（{formatTierPriceSummary(tierPrices)}）
        </p>
      </div>

      <FinanceSubnav active="/admin/revenue" monthParam={bounds.monthParam} />
      <FinanceMonthPickerBar monthParam={bounds.monthParam} />

      {canEditPricing && (
        <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">訂閱月費設定</h2>
          <p className="mt-1 text-sm text-gray-500">
            僅全權管理員可調整。商家在儀表板訂閱時將顯示以下月費。
          </p>
          <div className="mt-4">
            <AdminMerchantTierPricingForm initialPrices={tierPrices} />
          </div>
        </div>
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
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(p.paid_at).toLocaleString('zh-HK')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
