'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { MerchantLogoMark } from '@/components/merchant/merchant-branding-provider';
import { useMerchantMobileNav } from '@/components/merchant/merchant-mobile-nav-context';

export function MerchantMobileHeader() {
  const { toggle } = useMerchantMobileNav();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="開啟選單"
            onClick={toggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <MerchantLogoMark size="sm" />
            <span className="truncate text-base font-bold text-gray-900 dark:text-white">
              商家中心
            </span>
          </Link>
        </div>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
