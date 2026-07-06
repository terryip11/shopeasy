/**
 * 導覽列元件
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Search,
  User,
  Package,
  Shield,
  LogOut,
  RefreshCw,
  ChevronDown,
  Store,
  Bike,
  MapPin,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCartItemCount } from '@/lib/cart';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import type { UserRole } from '@/lib/auth/permissions';

export function Navbar() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [courierStatus, setCourierStatus] = useState<string | null>(null);

  const refreshCart = useCallback(() => {
    setCartCount(getCartItemCount());
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener('storage', refreshCart);
    window.addEventListener('shopeasy-cart-updated', refreshCart);
    return () => {
      window.removeEventListener('storage', refreshCart);
      window.removeEventListener('shopeasy-cart-updated', refreshCart);
    };
  }, [refreshCart]);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        setLoggedIn(!!data.user);
        setRole(data.role ?? null);
        setDisplayName(data.displayName ?? null);
        setEmail(data.user?.email ?? null);
        setCourierStatus(data.courier?.status ?? null);
      })
      .catch(() => {
        setLoggedIn(false);
        setRole(null);
        setDisplayName(null);
        setEmail(null);
        setCourierStatus(null);
      });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/products?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/products');
    }
  };

  const handleSignOut = async (redirectTo: string) => {
    setAuthLoading(true);
    setMenuOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign(redirectTo);
    } catch {
      setAuthLoading(false);
    }
  };

  const accountLabel =
    role === 'admin' || role === 'super_admin'
      ? '管理後台'
      : role === 'merchant'
        ? '商家中心'
        : '我的帳號';

  const dashboardHref =
    role === 'admin' || role === 'super_admin'
      ? '/admin'
      : role === 'merchant'
        ? '/dashboard'
        : '/orders';

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm dark:bg-black/90'
          : 'bg-white dark:bg-black'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-lg">
            S
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">ShopEasy</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md mx-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋商品、商家..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          {loggedIn && (
            <Link
              href="/orders"
              className="icon-interactive hidden text-gray-600 dark:text-gray-300 sm:block"
              title="我的訂單"
            >
              <Package className="h-5 w-5" />
            </Link>
          )}

          <Link
            href="/cart"
            className="icon-interactive relative text-gray-600 dark:text-gray-300"
            title="購物車"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {loggedIn ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                disabled={authLoading}
                className="pill-interactive flex items-center gap-2 rounded-full bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 dark:bg-white dark:text-gray-900 dark:hover:bg-orange-50 dark:hover:text-orange-700 sm:px-4"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {role === 'admin' || role === 'super_admin' ? (
                  <Shield className="h-4 w-4 shrink-0" />
                ) : role === 'merchant' ? (
                  <Store className="h-4 w-4 shrink-0" />
                ) : (
                  <User className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden max-w-[8rem] truncate sm:inline">
                  {displayName || accountLabel}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {displayName || accountLabel}
                    </p>
                    {email && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
                    )}
                  </div>

                  <Link
                    href={dashboardHref}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                  >
                    {role === 'admin' || role === 'super_admin' ? (
                      <Shield className="h-4 w-4" />
                    ) : role === 'merchant' ? (
                      <Store className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    {accountLabel}
                  </Link>

                  {(role === 'buyer' || !role) && (
                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                    >
                      <Package className="h-4 w-4" />
                      我的訂單
                    </Link>
                  )}

                  {loggedIn && (role === 'buyer' || !role) && (
                    <Link
                      href="/account/addresses"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                    >
                      <MapPin className="h-4 w-4" />
                      收貨地址
                    </Link>
                  )}

                  {loggedIn && (
                    <Link
                      href={courierStatus === 'active' ? '/courier' : '/courier'}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                    >
                      <Bike className="h-4 w-4" />
                      {courierStatus === 'active' ? '配送中心' : '成為配送員'}
                    </Link>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSignOut('/login?switch=1')}
                    disabled={authLoading}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                    切換帳號
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSignOut('/')}
                    disabled={authLoading}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    {authLoading ? '登出中...' : '登出'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="pill-interactive flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 dark:bg-white dark:text-gray-900 dark:hover:bg-orange-50 dark:hover:text-orange-700"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">登入</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
