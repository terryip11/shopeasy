import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getLandingVariant } from '@/lib/marketing/landing-theme';
import { AdminLandingVariantPicker } from '@/components/admin/admin-landing-variant-picker';

export const dynamic = 'force-dynamic';

export default async function AdminLandingPage() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    redirect('/admin');
  }

  const variant = await getLandingVariant();

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
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">首頁版面</h1>
        <p className="mt-1 text-sm text-gray-500">
          選擇公開首頁（與關於頁）使用的介紹版面。點選卡片即套用。
        </p>
      </div>

      <AdminLandingVariantPicker initialVariant={variant} />
    </div>
  );
}
