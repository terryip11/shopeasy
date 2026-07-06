'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { RECOMMENDED_TAB } from '@/lib/marketing/home-config';
import type { Category } from '@/lib/categories';

type Props = {
  categories: Category[];
};

export function ProductsCategoryTabs({ categories }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? '';
  const q = searchParams.get('q');

  if (pathname !== '/products') return null;

  const buildHref = (slug: string) => {
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    if (q) params.set('q', q);
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  const tabs = [RECOMMENDED_TAB, ...categories.map((c) => ({ slug: c.slug, label: c.name }))];

  return (
    <div className="scrollbar-hide -mx-3 overflow-x-auto px-3 md:-mx-6 md:px-6">
      <div className="flex gap-4 border-b border-gray-100 pb-0 dark:border-gray-800">
        {tabs.map((tab) => {
          const isActive = tab.slug === activeCategory;
          return (
            <Link
              key={tab.slug || 'recommended'}
              href={buildHref(tab.slug)}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-orange-500 text-orange-600'
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
