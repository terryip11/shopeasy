import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import {
  ensureLockedMonetizationSettings,
  getPlatformMonetizationSettings,
} from '@/lib/finance/monetization';
import { AdminMonetizationForm } from '@/components/admin/admin-monetization-form';
import { logAdminAction } from '@/lib/admin/merchant-actions';

export const dynamic = 'force-dynamic';

export default async function AdminMonetizationPage() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    redirect('/admin');
  }

  const user = await getAuthUser();
  const sync = await ensureLockedMonetizationSettings(user?.id ?? null);
  if (sync.updated && user) {
    await logAdminAction(
      user.id,
      'platform.monetization.lock',
      'platform_settings',
      'monetization',
      sync.settings
    );
  }

  const settings = await getPlatformMonetizationSettings();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回管理後台
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">收費與結算</h1>
        <p className="mt-1 text-sm text-gray-500">
          平台以商家訂閱為主要收入；訂閱為主與商家直付已鎖定，不可切換舊模式。
        </p>
      </div>

      {sync.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sync.error}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <AdminMonetizationForm settings={settings} justSynced={sync.updated} />
      </div>
    </div>
  );
}
