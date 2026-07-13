import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Share2 } from 'lucide-react';
import { getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import { AdminAffiliateSettingsForm } from '@/components/admin/admin-affiliate-settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminAffiliatePage() {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    redirect('/admin');
  }

  const settings = await getAffiliatePlatformSettings();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/admin"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">分享推廣系統</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            配置全站分享推廣：平台抽成、歸屬天數、商家佣金上下限
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 text-sm text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200">
        <p className="font-medium">使用說明</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-violet-800/90 dark:text-violet-200/90">
          <li>
            在{' '}
            <Link href="/admin/users" className="font-medium underline">
              用戶與角色
            </Link>{' '}
            將帳號設為「分享員」
          </li>
          <li>買家於「我的帳號」登記成為分享員，並填寫轉數快 FPS 收款資料</li>
          <li>商家於商家中心 → 分享推廣，開啟計劃並勾選可分享商品</li>
          <li>分享員於 /promoter 建立連結；買家點擊後下單，付款成功自動分帳</li>
        </ul>
      </div>

      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">平台設定</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">儲存後即對全站生效</p>
        <AdminAffiliateSettingsForm initial={settings} />
      </div>
    </div>
  );
}
