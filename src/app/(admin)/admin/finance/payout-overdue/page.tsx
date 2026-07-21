import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import { listAdminOverdueMerchants } from '@/lib/merchant/payout-compliance';
import { FinanceSubnav } from '@/components/admin/finance-subnav';
import { AdminPayoutOverduePanel } from '@/components/admin/admin-payout-overdue-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPayoutOverduePage() {
  const role = await getUserRole();
  if (!canManageFinance(role)) redirect('/admin');

  let data: Awaited<ReturnType<typeof listAdminOverdueMerchants>> | null = null;
  let loadError = '';
  try {
    data = await listAdminOverdueMerchants();
  } catch (error) {
    loadError = (error as Error).message;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">逾期未付跟進</h1>
        <p className="mt-1 text-sm text-gray-500">
          商家直付模式下，逾期催付、限制新建配送，以及分享員／配送員未付回報。平台不代墊。
        </p>
      </div>

      <FinanceSubnav active="/admin/finance/payout-overdue" />

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError.includes('payout_') || loadError.includes('payout_delivery')
            ? '請先執行 supabase/migrate-v55-payout-overdue.sql'
            : loadError}
        </div>
      ) : data ? (
        <AdminPayoutOverduePanel
          initialThresholds={data.thresholds}
          initialMerchants={data.merchants}
          initialReports={data.openReports}
        />
      ) : null}
    </div>
  );
}
