'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const ANCHORS = [
  { href: '#what', label: '平台是什麼' },
  { href: '#how', label: '如何運作' },
  { href: '#roles', label: '誰在使用' },
] as const;

/**
 * 落地頁專用導覽：介紹錨點＋購物／商家，不含搜尋購物車
 */
export function PlatformLandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-stone-200/80 bg-white/95 text-stone-900 backdrop-blur-md'
          : 'bg-transparent text-white'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          ShopEasy
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {ANCHORS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition ${
                scrolled ? 'text-stone-600 hover:text-stone-900' : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/merchant/apply"
            className={`text-sm font-medium transition ${
              scrolled ? 'text-stone-600 hover:text-stone-900' : 'text-white/85 hover:text-white'
            }`}
          >
            商家入駐
          </Link>
          <Link
            href="/login"
            className={`text-sm font-medium transition ${
              scrolled ? 'text-stone-600 hover:text-stone-900' : 'text-white/85 hover:text-white'
            }`}
          >
            登入
          </Link>
          <Link
            href="/products"
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            開始購物
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden"
          aria-label={open ? '關閉選單' : '開啟選單'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-stone-200 bg-white px-4 py-4 text-stone-900 md:hidden">
          <div className="flex flex-col gap-1">
            {ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-stone-100"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/merchant/apply"
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-stone-100"
              onClick={() => setOpen(false)}
            >
              商家入駐
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-stone-100"
              onClick={() => setOpen(false)}
            >
              登入
            </Link>
            <Link
              href="/products"
              className="mt-2 rounded-xl bg-orange-500 px-3 py-3 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              開始購物
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
