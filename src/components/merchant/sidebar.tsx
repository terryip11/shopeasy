/**
 * 商家中心側邊導航欄（桌面版）
 */

'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { MerchantNavLinks } from '@/components/merchant/merchant-nav-links';
import { MerchantOutboundLinks } from '@/components/merchant/merchant-outbound-links';
import { MerchantLogoMark } from '@/components/merchant/merchant-branding-provider';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 lg:flex ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <MerchantLogoMark size="sm" />
          {!collapsed && (
            <span className="truncate text-lg font-bold text-gray-900 dark:text-white">
              商家中心
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="icon-interactive text-gray-500 dark:text-gray-400"
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <MerchantNavLinks collapsed={collapsed} />
      </div>

      <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <MerchantOutboundLinks collapsed={collapsed} />
      </div>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <ThemeSwitcher variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  );
}
