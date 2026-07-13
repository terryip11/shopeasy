import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Share2 } from 'lucide-react';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { PromoterApplyForm } from '@/components/promoter/promoter-apply-form';
import { getAuthUser, getProfile } from '@/lib/auth/server';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import { canSelfRegisterAsPromoter } from '@/lib/promoter/apply';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AccountPromoterPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login?redirect=/account/promoter');
  }

  const [profile, platform] = await Promise.all([getProfile(), getAffiliatePlatformSettings()]);
  const role = profile?.role ?? 'buyer';

  if (role === 'promoter') {
    redirect('/promoter');
  }

  return (
    <div className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          <ChevronLeft className="h-4 w-4" />
          返回我的帳號
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <Share2 className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">登記成為分享員</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          免費加入，推廣商品即可賺取佣金（需登記轉數快 FPS 收款資料）
        </p>

        {!platform.enabled ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">分享推廣計劃暫未開放</p>
            <p className="mt-2">請稍後再試，或聯絡平台客服了解開放時間。</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/account">返回我的帳號</Link>
            </Button>
          </div>
        ) : !canSelfRegisterAsPromoter(role) ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white">目前身分無法登記</p>
            <p className="mt-2">
              分享員登記僅開放給一般買家帳號。若您已是商家或其他平台身分，請使用另一個買家帳號登記，或聯絡平台協助。
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/account">返回我的帳號</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8">
            <PromoterApplyForm />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
