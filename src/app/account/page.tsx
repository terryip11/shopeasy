import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bike,
  ChevronRight,
  MapPin,
  Package,
  Share2,
  Store,
  User,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { getAuthUser, getProfile } from '@/lib/auth/server';
import { getCourierProfile } from '@/lib/courier/server';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';
import { canSelfRegisterAsPromoter } from '@/lib/promoter/apply';

export const dynamic = 'force-dynamic';

const BUYER_ROLE_LABELS: Record<string, string> = {
  buyer: '買家',
  promoter: '分享員',
};

export default async function AccountPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login?redirect=/account');
  }

  const [profile, courier, platform] = await Promise.all([
    getProfile(),
    getCourierProfile(user.id),
    getAffiliatePlatformSettings(),
  ]);

  const displayName = profile?.display_name?.trim() || '會員';
  const role = profile?.role ?? 'buyer';
  const roleLabel = BUYER_ROLE_LABELS[role] ?? role;

  const menuItems = [
    {
      href: '/orders',
      icon: Package,
      title: '我的訂單',
      description: '查看進行中與歷史訂單',
    },
    {
      href: '/account/addresses',
      icon: MapPin,
      title: '收貨地址',
      description: '管理常用收貨地址',
    },
    {
      href: '/courier',
      icon: Bike,
      title: courier?.status === 'active' ? '配送中心' : '成為配送員',
      description:
        courier?.status === 'active' ? '查看配送任務與收入' : '申請加入配送團隊',
    },
    {
      href: '/merchant/apply',
      icon: Store,
      title: '申請開店',
      description: '成為商家，開始在平台銷售商品',
    },
  ];

  if (role === 'promoter') {
    menuItems.unshift({
      href: '/promoter',
      icon: Share2,
      title: '分享員中心',
      description: '查看分享連結與佣金收入',
    });
  } else if (platform.enabled && canSelfRegisterAsPromoter(role)) {
    menuItems.push({
      href: '/account/promoter',
      icon: Share2,
      title: '登記成為分享員',
      description: '免費加入，需登記 FPS 收款資料',
    });
  }

  return (
    <div className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的帳號</h1>
        <p className="mt-1 text-sm text-gray-500">管理個人資料與常用功能</p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <User className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-sm text-gray-500">{user.email}</p>
              <p className="mt-1 text-xs text-gray-400">身分：{roleLabel}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-900/50 dark:hover:bg-orange-950/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
