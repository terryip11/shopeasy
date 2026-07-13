'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { StoreCategory } from '@/lib/merchant/store-page';

const ALL_TAB = { slug: '', label: '全部' } as const;

type Props = {
  storeSlug: string;
  categories: StoreCategory[];
};

export function StoreCategoryTabs({ storeSlug, categories }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? '';
  const q = searchParams.get('q');
  const storeBase = `/stores/${storeSlug}`;

  if (!pathname.startsWith(`/stores/${storeSlug}`)) return null;

  const buildHref = (slug: string) => {
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    if (q) params.set('q', q);
    const qs = params.toString();
    return qs ? `${storeBase}?${qs}` : storeBase;
  };

  const tabs = [ALL_TAB, ...categories.map((c) => ({ slug: c.slug, label: c.name }))];

  if (tabs.length <= 1) return null;

  return (
    <div className="scrollbar-hide -mx-3 overflow-x-auto px-3 md:-mx-0 md:px-0">
      <div className="flex gap-4 border-b border-gray-100 pb-0 dark:border-gray-800">
        {tabs.map((tab) => {
          const isActive = tab.slug === activeCategory;
          return (
            <Link
              key={tab.slug || 'all'}
              href={buildHref(tab.slug)}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[var(--store-theme)] text-[var(--store-theme)]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
