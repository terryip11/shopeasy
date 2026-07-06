'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bike, Package, ChevronLeft, Home, User, Wallet } from 'lucide-react';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import { cn } from '@/lib/utils';

type Tab = 'work' | 'profile' | 'hub' | 'earnings';

type Props = {
  children: React.ReactNode;
  variant?: DeliveryJobType;
  activeTab?: Tab;
  title?: string;
  showBack?: boolean;
};

const VARIANT_META: Record<
  DeliveryJobType,
  { label: string; accent: string; accentBg: string; icon: typeof Bike }
> = {
  food: {
    label: '送餐員',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-500',
    icon: Bike,
  },
  parcel: {
    label: '送貨員',
    accent: 'text-sky-600',
    accentBg: 'bg-sky-500',
    icon: Package,
  },
};

export function CourierMobileShell({
  children,
  variant,
  activeTab = 'work',
  title,
  showBack = false,
}: Props) {
  const pathname = usePathname();
  const resolvedVariant: DeliveryJobType =
    variant ?? (pathname.includes('/courier/food') ? 'food' : 'parcel');
  const meta = VARIANT_META[resolvedVariant];
  const WorkIcon = meta.icon;
  const workHref = `/courier/${resolvedVariant}`;
  const isEarnings = activeTab === 'earnings';
  const isProfile = activeTab === 'profile';
  const headerTitle = title ?? (isEarnings ? '我的收入' : isProfile ? '配送員資料' : meta.label);
  const headerSubtitle = isEarnings ? '配送收入' : isProfile ? '個人' : meta.label;
  const headerAccent = isEarnings
    ? 'text-emerald-600'
    : isProfile
      ? 'text-violet-600'
      : meta.accent;
  const headerAccentBg = isEarnings
    ? 'bg-emerald-500'
    : isProfile
      ? 'bg-violet-500'
      : meta.accentBg;
  const HeaderIcon = isEarnings ? Wallet : isProfile ? User : WorkIcon;

  const tabs = [
    { id: 'hub' as const, href: '/courier', label: '首頁', icon: Home },
    { id: 'work' as const, href: workHref, label: '工作台', icon: WorkIcon },
    { id: 'earnings' as const, href: '/courier/earnings', label: '收入', icon: Wallet },
    { id: 'profile' as const, href: '/courier/profile', label: '資料', icon: User },
  ];

  const isApplyPage = pathname.endsWith('/apply');

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col">
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95',
          isApplyPage && 'border-b-0'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {showBack ? (
            <Link
              href="/courier"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="返回"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white',
                headerAccentBg
              )}
            >
              <HeaderIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs font-medium', headerAccent)}>{headerSubtitle}</p>
            <h1 className="truncate text-base font-bold text-gray-900 dark:text-white">
              {headerTitle}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            const tabAccent =
              tab.id === 'earnings'
                ? 'text-emerald-600'
                : tab.id === 'profile'
                  ? 'text-violet-600'
                  : meta.accent;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors sm:min-w-[4rem] sm:text-xs',
                  active
                    ? cn(tabAccent, 'bg-gray-50 dark:bg-gray-900')
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <TabIcon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
