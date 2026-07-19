import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance, isSuperAdmin } from '@/lib/auth/permissions';
import {
  listMerchantsCreditAdmin,
  listPendingTopupRequestsAdmin,
} from '@/lib/finance/platform-credit';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { AdminPlatformCreditPanel } from '@/components/admin/admin-platform-credit-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPlatformCreditPage() {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  const [merchants, pendingTopups] = await Promise.all([
    listMerchantsCreditAdmin(),
    listPendingTopupRequestsAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商家預付餘額</h1>
        <p className="mt-1 text-sm text-gray-500">
          線下訂單的平台服務費自商家預付餘額扣除。審核儲值申請或直接調帳。
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/credits" />

      <AdminPlatformCreditPanel
        merchants={merchants}
        pendingTopups={pendingTopups as Parameters<typeof AdminPlatformCreditPanel>[0]['pendingTopups']}
        canEdit={isSuperAdmin(role) || role === 'admin' || role === 'accountant'}
      />
    </div>
  );
}
