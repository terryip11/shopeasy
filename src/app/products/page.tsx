/**
 * 商品列表頁 — 手機優先購物首頁（PWA 預留）
 */

import { Suspense } from 'react';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ProductsMobileHeader } from '@/components/marketing/products-home/products-mobile-header';
import { ProductsCategoryTabs } from '@/components/marketing/products-home/products-category-tabs';
import { ProductsHomeBanner } from '@/components/marketing/products-home/products-home-banner';
import { ProductsShortcutGrid } from '@/components/marketing/products-home/products-shortcut-grid';
import { ProductsFlashRow } from '@/components/marketing/products-home/products-flash-row';
import { ProductsFeedSection } from '@/components/marketing/products-home/products-feed-section';
import { ProductsBottomNav } from '@/components/marketing/products-home/products-bottom-nav';
import { getProductsForFeed } from '@/lib/products';
import { getCategories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

function feedTitle(q?: string, categorySlug?: string, categories?: { slug: string; name: string }[]) {
  if (q && categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug)?.name;
    return cat ? `「${cat}」搜尋「${q}」` : `搜尋「${q}」`;
  }
  if (q) return `搜尋「${q}」`;
  if (categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug)?.name;
    return cat ? cat : '分類商品';
  }
  return '為你推薦';
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { q, category: categorySlug } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(12),
    getProductsForFeed({ q, categorySlug, limit: 24 }),
  ]);

  const sectionTitle = feedTitle(q, categorySlug, categories);
  const showHomeModules = !q && !categorySlug;

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* 手機：精簡頂欄 */}
      <div className="md:hidden">
        <ProductsMobileHeader initialQuery={q ?? ''} />
      </div>

      {/* 桌面：完整導覽 */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <main className="mx-auto w-full max-w-lg flex-1 px-3 py-3 pb-20 md:max-w-7xl md:px-6 md:py-6 md:pb-10">
        {/* 桌面搜尋提示區 */}
        <div className="mb-4 hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {sectionTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-500">精選商品，包郵到港</p>
        </div>

        <Suspense fallback={<div className="h-10" />}>
          <ProductsCategoryTabs categories={categories} />
        </Suspense>

        {showHomeModules && (
          <div className="mt-4 space-y-4">
            <ProductsHomeBanner />
            <ProductsShortcutGrid />
            <ProductsFlashRow products={products} />
          </div>
        )}

        <div className={showHomeModules ? 'mt-5' : 'mt-4'}>
          <ProductsFeedSection products={products} title={sectionTitle} />
        </div>
      </main>

      <ProductsBottomNav />

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
