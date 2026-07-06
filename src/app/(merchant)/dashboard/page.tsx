/**
 * 商家中心儀表板首頁
 */

import Link from 'next/link';
import { getMerchantDashboardStats } from '@/lib/merchant/server';
import { getActiveMerchantForUser, getAuthUser } from '@/lib/auth/server';
import { getMerchantTierInfo, type MerchantTier } from '@/lib/merchant/tiers';
import { fulfillMerchantTierFromCheckoutSession } from '@/lib/merchant/subscription';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import { MerchantTierPanel } from '@/components/merchant/merchant-tier-panel';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { MerchantDeliveryJobInfo } from '@/components/merchant/merchant-delivery-job-info';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';

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
  const [stats, tierInfo] = await Promise.all([
    getMerchantDashboardStats(),
    merchant
      ? getMerchantTierInfo(merchant.id, (merchant.tier as MerchantTier) || 'basic', {
          tier_period_end: merchant.tier_period_end,
          stripe_subscription_id: merchant.stripe_subscription_id,
        })
      : null,
  ]);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">儀表板</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          歡迎回來！這是您的店鋪概覽
        </p>
      </div>

      {tierInfo && (
        <MerchantTierPanel
          initial={tierInfo}
          showUpgradeSuccess={params.tier_upgraded === '1'}
          stripePaymentsEnabled={isStripePaymentsEnabled()}
        />
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800"
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
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              最近訂單
            </h2>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            查看全部
          </Link>
        </div>
        <div className="overflow-x-auto">
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
