import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getPlatformUsageStats } from '@/lib/admin/platform-usage';
import { PlatformUsagePanel } from '@/components/admin/platform-usage-panel';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminUsagePage() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    redirect('/admin');
  }

  const stats = await getPlatformUsageStats();

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
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">平台使用統計</h1>
        <p className="mt-1 text-sm text-gray-500">全權管理員專用 · 每日／每月用戶活躍概覽</p>
      </div>

      <PlatformUsagePanel stats={stats} />
    </div>
  );
}
