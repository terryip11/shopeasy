import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPendingMerchants } from '@/lib/admin/merchant-actions';
import { getPendingCourierCount } from '@/lib/admin/couriers';
import { getPlatformUsageStats } from '@/lib/admin/platform-usage';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission, isSuperAdmin, isAccountant } from '@/lib/auth/permissions';
import { PlatformUsagePanel } from '@/components/admin/platform-usage-panel';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const role = await getUserRole();
  const [pending, pendingCouriers, usageStats] = await Promise.all([
    getPendingMerchants(),
    getPendingCourierCount(),
    isSuperAdmin(role) ? getPlatformUsageStats() : Promise.resolve(null),
  ]);

  if (isAccountant(role)) {
    redirect('/admin/finance');
  }

  const superAdmin = isSuperAdmin(role);
  const showCouriers = hasPermission(role, 'couriers:read');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">管理後台</h1>
      <p className="mb-6 text-sm text-gray-500 sm:mb-8 sm:text-base">
        {superAdmin ? '全權管理員 — 可管理系統與用戶' : '營運管理員 — 日常審核與內容管理'}
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 sm:mb-8">
        <Link
          href="/admin/merchants/pending"
          className="rounded-xl bg-orange-50 p-6 hover:shadow-md transition dark:bg-orange-900/20"
        >
          <p className="text-3xl font-bold text-orange-600">{pending.length}</p>
          <p className="text-sm font-medium mt-1">待審核商家</p>
        </Link>
        {showCouriers && (
          <Link
            href="/admin/couriers"
            className="rounded-xl bg-sky-50 p-6 hover:shadow-md transition dark:bg-sky-900/20"
          >
            <p className="text-3xl font-bold text-sky-600">{pendingCouriers}</p>
            <p className="text-sm font-medium mt-1">待審核配送員</p>
          </Link>
        )}
        <Link href="/admin/orders" className="rounded-xl bg-white p-6 shadow hover:shadow-md dark:bg-gray-900">
          <p className="text-sm font-medium">訂單查詢</p>
          <p className="text-xs text-gray-500 mt-1">查看全平台訂單</p>
        </Link>
        <Link href="/admin/categories" className="rounded-xl bg-white p-6 shadow hover:shadow-md dark:bg-gray-900">
          <p className="text-sm font-medium">分類管理</p>
          <p className="text-xs text-gray-500 mt-1">管理平台分類</p>
        </Link>
        {superAdmin && (
          <Link
            href="/admin/affiliate"
            className="rounded-xl bg-violet-50 p-6 hover:shadow-md transition dark:bg-violet-900/20"
          >
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200">分享推廣系統</p>
            <p className="text-xs text-violet-600/80 dark:text-violet-300 mt-1">平台收費、佣金規則、分享員角色</p>
          </Link>
        )}
        {showCouriers && (
          <Link
            href="/admin/couriers/zones"
            className="rounded-xl bg-white p-6 shadow hover:shadow-md dark:bg-gray-900"
          >
            <p className="text-sm font-medium">配送區域設定</p>
            <p className="text-xs text-gray-500 mt-1">香港大區與 18 區管理</p>
          </Link>
        )}
      </div>

      {superAdmin && usageStats && (
        <div className="mb-8 rounded-xl border border-orange-200 bg-white p-6 shadow-sm dark:border-orange-800 dark:bg-gray-900">
          <PlatformUsagePanel stats={usageStats} compact />
        </div>
      )}

      {superAdmin && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-6 dark:border-orange-800 dark:bg-orange-900/10">
          <h2 className="font-semibold text-orange-800 dark:text-orange-300">全權管理員專區</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/admin/usage" className="text-orange-600 hover:underline">
                平台使用統計
              </Link>
            </li>
            <li>
              <Link href="/admin/finance" className="text-orange-600 hover:underline">
                交易財務
              </Link>
            </li>
            <li>
              <Link href="/admin/revenue" className="text-orange-600 hover:underline">
                商家訂閱收入
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="text-orange-600 hover:underline">
                用戶與角色管理
              </Link>
            </li>
            <li>
              <Link href="/admin/affiliate" className="text-orange-600 hover:underline">
                分享推廣系統
              </Link>
            </li>
            <li>
              <Link href="/admin/audit" className="text-orange-600 hover:underline">
                審計日誌
              </Link>
            </li>
            <li>
              <Link href="/admin/merchants" className="text-orange-600 hover:underline">
                商家完整管理（含停用）
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
