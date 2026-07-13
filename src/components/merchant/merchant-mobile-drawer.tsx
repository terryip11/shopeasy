'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { MerchantNavLinks } from '@/components/merchant/merchant-nav-links';
import { MerchantOutboundLinks } from '@/components/merchant/merchant-outbound-links';
import { MerchantLogoMark } from '@/components/merchant/merchant-branding-provider';
import { useMerchantMobileNav } from '@/components/merchant/merchant-mobile-nav-context';

export function MerchantMobileDrawer() {
  const { open, setOpen } = useMerchantMobileNav();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="關閉選單"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(100vw-3rem,20rem)] flex-col bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <MerchantLogoMark size="sm" />
            <span className="font-semibold text-gray-900 dark:text-white">商家中心</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="關閉"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <MerchantNavLinks onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <MerchantOutboundLinks onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <ThemeSwitcher variant="sidebar" collapsed={false} />
        </div>
      </aside>
    </div>
  );
}
