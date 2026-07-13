'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { useOrderNotifications } from '@/components/merchant/order-notification-provider';

export type MerchantNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const MERCHANT_NAV_ITEMS: MerchantNavItem[] = [
  { href: '/dashboard', label: '儀表板', icon: LayoutDashboard },
  { href: '/dashboard/products', label: '商品管理', icon: Package },
  { href: '/dashboard/orders', label: '訂單管理', icon: ShoppingCart },
  { href: '/dashboard/affiliate', label: '分享推廣', icon: Share2 },
  { href: '/dashboard/settings', label: '店鋪設置', icon: Settings },
];

type Props = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function MerchantNavLinks({ collapsed = false, onNavigate }: Props) {
  const pathname = usePathname();
  const { attentionCount } = useOrderNotifications();

  return (
    <nav className="space-y-1">
      {MERCHANT_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const showBadge = item.href === '/dashboard/orders' && attentionCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/20 dark:text-orange-400'
                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-400'
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
  );
}
