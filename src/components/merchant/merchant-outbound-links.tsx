'use client';

import Link from 'next/link';
import { Home, Store } from 'lucide-react';
import { useMerchantBranding } from '@/components/merchant/merchant-branding-provider';
import { cn } from '@/lib/utils';

type Props = {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
};

export function MerchantOutboundLinks({ collapsed = false, className, onNavigate }: Props) {
  const { storeSlug } = useMerchantBranding();

  const linkClass =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white';

  return (
    <div className={cn('space-y-1', className)}>
      <Link href="/" className={linkClass} onClick={onNavigate} title={collapsed ? '返回首頁' : undefined}>
        <Home className="h-5 w-5 shrink-0 text-orange-500" />
        {!collapsed && <span>返回首頁</span>}
      </Link>
      {storeSlug ? (
        <Link
          href={`/stores/${storeSlug}`}
          className={linkClass}
          onClick={onNavigate}
          title={collapsed ? '我的店鋪' : undefined}
        >
          <Store className="h-5 w-5 shrink-0 text-orange-500" />
          {!collapsed && <span>我的店鋪</span>}
        </Link>
      ) : (
        !collapsed && (
          <p className="px-3 py-2 text-xs text-gray-400">店鋪審核通過後可預覽</p>
        )
      )}
    </div>
  );
}
