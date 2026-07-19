import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import { getPlatformPayoutSettings } from '@/lib/finance/platform-payout';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { AdminPlatformPayoutForm } from '@/components/admin/admin-platform-payout-form';

export const dynamic = 'force-dynamic';

export default async function AdminPlatformPayoutPage() {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  const settings = await getPlatformPayoutSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">平台收款設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          設定 ShopEasy 平台轉數快（FPS）收款資料，供商家預付／儲值平台服務費時轉帳
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/platform-payout" />

      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <AdminPlatformPayoutForm initial={settings} canEdit={isSuperAdmin(role)} />
      </div>
    </div>
  );
}
