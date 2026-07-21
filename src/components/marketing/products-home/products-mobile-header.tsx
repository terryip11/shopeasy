'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Info } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getCartItemCount } from '@/lib/cart';

type Props = {
  initialQuery?: string;
};

export function ProductsMobileHeader({ initialQuery = '' }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(() => {
    setCartCount(getCartItemCount());
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    refreshCart();
    window.addEventListener('shopeasy-cart-updated', refreshCart);
    window.addEventListener('storage', refreshCart);
    return () => {
      window.removeEventListener('shopeasy-cart-updated', refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, [refreshCart]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams(window.location.search);
    if (q) params.set('q', q);
    else params.delete('q');
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5 md:max-w-7xl md:gap-4 md:px-6 md:py-3">
        <Link href="/products" className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">
            S
          </div>
          <span className="hidden text-base font-bold text-gray-900 dark:text-white sm:inline">
            ShopEasy
          </span>
        </Link>

        <form onSubmit={handleSearch} className="min-w-0 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋商品、店鋪"
              enterKeyHint="search"
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </form>

        <Link
          href="/about"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100 dark:text-gray-200 dark:active:bg-gray-800"
          aria-label="關於 ShopEasy"
        >
          <Info className="h-5 w-5" />
        </Link>

        <Link
          href="/cart"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100 dark:text-gray-200 dark:active:bg-gray-800"
          aria-label="購物車"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
