'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Home, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useAdminMobileNav } from '@/components/admin/admin-mobile-nav-context';

export function AdminHeader() {
  const [loggingOut, setLoggingOut] = useState(false);
  const { toggle } = useAdminMobileNav();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign('/login');
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="開啟選單"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/admin" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">
            S
          </div>
          <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            管理後台
          </h1>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/"
          className="icon-interactive flex items-center gap-1.5 rounded-lg p-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 sm:px-3"
          title="回到前台"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">前台</span>
        </Link>

        <ThemeSwitcher />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{loggingOut ? '登出中...' : '登出'}</span>
        </Button>
      </div>
    </div>
  );
}
