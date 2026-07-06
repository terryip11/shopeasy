'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Package, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getCartItemCount } from '@/lib/cart';

const NAV_ITEMS = [
  { href: '/products', label: '首頁', icon: Home, match: (p: string) => p === '/products' },
  { href: '/categories', label: '分類', icon: LayoutGrid, match: (p: string) => p.startsWith('/categories') },
  { href: '/cart', label: '購物車', icon: ShoppingCart, match: (p: string) => p === '/cart', showBadge: true },
  { href: '/orders', label: '訂單', icon: Package, match: (p: string) => p.startsWith('/orders') },
  { href: '/orders', label: '我的', icon: User, match: () => false },
] as const;

export function ProductsBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(() => {
    setCartCount(getCartItemCount());
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener('shopeasy-cart-updated', refreshCart);
    window.addEventListener('storage', refreshCart);
    return () => {
      window.removeEventListener('shopeasy-cart-updated', refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, [refreshCart]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          const badge = 'showBadge' in item && item.showBadge && cartCount > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex min-w-[3.5rem] flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${
                active ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              <span className="relative">
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                {badge && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
