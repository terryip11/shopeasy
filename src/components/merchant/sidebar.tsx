/**
 * 商家中心側邊導航欄
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useOrderNotifications } from '@/components/merchant/order-notification-provider';
import { MerchantLogoMark } from '@/components/merchant/merchant-branding-provider';

const navItems = [
  {
    href: '/dashboard',
    label: '儀表板',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/products',
    label: '商品管理',
    icon: Package,
  },
  {
    href: '/dashboard/orders',
    label: '訂單管理',
    icon: ShoppingCart,
  },
  {
    href: '/dashboard/settings',
    label: '店鋪設置',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { attentionCount } = useOrderNotifications();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}
    >
      {/* Logo Area */}
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
          onClick={() => setCollapsed(!collapsed)}
          className="icon-interactive text-gray-500 dark:text-gray-400"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showBadge = item.href === '/dashboard/orders' && attentionCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/20 dark:text-orange-400'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:translate-x-1 hover:shadow-sm dark:text-gray-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-400'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-orange-500' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {showBadge && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ${
                    collapsed ? 'absolute -right-0.5 -top-0.5' : 'ml-auto'
                  }`}
                >
                  {attentionCount > 99 ? '99+' : attentionCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3 dark:border-gray-800">
        <ThemeSwitcher variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  );
}
