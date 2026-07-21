/**
 * 商家中心儀表板首頁
 */

import Link from 'next/link';
import { getMerchantDashboardStats } from '@/lib/merchant/server';
import { getActiveMerchantForUser, getAuthUser } from '@/lib/auth/server';
import { getMerchantTierInfo, type MerchantTier } from '@/lib/merchant/tiers';
import { getTierMonthlyPrices } from '@/lib/merchant/tier-pricing';
import { fulfillMerchantTierFromCheckoutSession } from '@/lib/merchant/subscription';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import { MerchantTierPanel } from '@/components/merchant/merchant-tier-panel';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Home,
  Store,
} from 'lucide-react';
import { MerchantDeliveryJobInfo } from '@/components/merchant/merchant-delivery-job-info';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { refreshMerchantPayoutRestriction } from '@/lib/merchant/payout-compliance';
import { MerchantPayoutOverdueBanner } from '@/components/merchant/merchant-payout-overdue-banner';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ tier_upgraded?: string; session_id?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getAuthUser();

  if (params.session_id && user) {
    await fulfillMerchantTierFromCheckoutSession(params.session_id, user.id);
  }

  const merchant = await getActiveMerchantForUser();
  const [stats, tierInfo, tierPrices] = await Promise.all([
    getMerchantDashboardStats(),
    merchant
      ? getMerchantTierInfo(merchant.id, (merchant.tier as MerchantTier) || 'basic', {
          tier_period_end: merchant.tier_period_end,
          stripe_subscription_id: merchant.stripe_subscription_id,
        })
      : null,
    getTierMonthlyPrices(),
  ]);

  const payoutCompliance = merchant
    ? await refreshMerchantPayoutRestriction(merchant.id)
    : null;

  const statCards = [
    {
      title: '總銷售額',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      title: '總訂單',
      value: stats.ordersCount.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      title: '商品數量',
      value: stats.productsCount.toString(),
      icon: Package,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    },
    {
      title: '待處理訂單',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    },
  ];

  return (
    <div className="space-y-8">
      {payoutCompliance && <MerchantPayoutOverdueBanner compliance={payoutCompliance} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">儀表板</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            歡迎回來！這是您的店鋪概覽
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首頁
            </Link>
          </Button>
          {merchant?.slug ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/stores/${merchant.slug}`}>
                <Store className="mr-2 h-4 w-4" />
                我的店鋪
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {tierInfo && (
        <MerchantTierPanel
          initial={tierInfo}
          monthlyPrices={tierPrices}
          showUpgradeSuccess={params.tier_upgraded === '1'}
          stripePaymentsEnabled={isStripePaymentsEnabled()}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-800"
            >
              <div className={`inline-flex rounded-xl p-3 ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white shadow-sm dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近訂單</h2>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            查看全部
          </Link>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order) => {
              const job = stats.deliveryJobs[order.id] ?? null;
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-orange-600">
                        #{order.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString('zh-HK', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        HK${order.total?.toFixed(2)}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <p className="text-xs text-gray-400">配送</p>
                    <div className="mt-1">
                      <MerchantDeliveryJobInfo job={job} />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">暫無訂單數據</p>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  訂單 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  配送資訊
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  日期
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => {
                  const job = stats.deliveryJobs[order.id] ?? null;
                  return (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-orange-600 hover:underline"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">${order.total?.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <MerchantDeliveryJobInfo job={job} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('zh-TW')}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    暫無訂單數據
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <Link
          href="/dashboard/products"
          className="group flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md dark:bg-gray-800"
        >
          <Package className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">管理商品</h3>
            <p className="text-sm text-gray-500">添加或編輯商品</p>
          </div>
        </Link>
        <Link
          href="/dashboard/settings"
          className="group flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md dark:bg-gray-800"
        >
          <DollarSign className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">店鋪設置</h3>
            <p className="text-sm text-gray-500">配置店鋪信息</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
