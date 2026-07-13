/**
 * 店鋪頁面 — 商家專屬迷你商城
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ProductsBottomNav } from '@/components/marketing/products-home/products-bottom-nav';
import { StoreHeader } from '@/components/marketing/store/store-header';
import { StoreHero } from '@/components/marketing/store/store-hero';
import { StoreCategoryTabs } from '@/components/marketing/store/store-category-tabs';
import { StoreProductGrid } from '@/components/marketing/store/store-product-grid';
import { StoreFeaturedRow } from '@/components/marketing/store/store-featured-row';
import { StoreDeliveryInfo } from '@/components/marketing/store/store-delivery-info';
import { getDeliveryZones } from '@/lib/courier/server';
import { normalizeStoreThemeColor, storeThemeCssVars } from '@/lib/merchant/store-theme';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import {
  getActiveMerchantBySlug,
  getStoreCategories,
  getStoreFeaturedProducts,
  getStoreProductCount,
  getStoreProducts,
  getStoreShippingHint,
} from '@/lib/merchant/store-page';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await getActiveMerchantBySlug(slug);

  if (!merchant) {
    return { title: '店鋪不存在｜ShopEasy' };
  }

  const logo = normalizeR2ImageUrl(merchant.logo_url);
  const banner = normalizeR2ImageUrl(merchant.banner_url);
  const description =
    merchant.store_tagline?.trim() ||
    merchant.store_description?.trim()?.slice(0, 160) ||
    `在 ShopEasy 瀏覽 ${merchant.name} 的精選商品`;

  return {
    title: `${merchant.name}｜ShopEasy`,
    description,
    openGraph: {
      title: `${merchant.name}｜ShopEasy`,
      description,
      type: 'website',
      images: banner || logo ? [{ url: (banner ?? logo)! }] : undefined,
    },
  };
}

export default async function StorePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q, category: categorySlug } = await searchParams;

  const merchant = await getActiveMerchantBySlug(slug);
  if (!merchant) notFound();

  const showHomeModules = !q && !categorySlug;
  const themeColor = normalizeStoreThemeColor(merchant.theme_color);

  const [categories, products, productCount, featuredProducts, zones, shippingHint] =
    await Promise.all([
      getStoreCategories(merchant.id),
      getStoreProducts(merchant.id, { q, categorySlug }),
      getStoreProductCount(merchant.id),
      showHomeModules ? getStoreFeaturedProducts(merchant.id, 4) : Promise.resolve([]),
      showHomeModules ? getDeliveryZones() : Promise.resolve([]),
      showHomeModules ? getStoreShippingHint(merchant.id) : Promise.resolve({ minFee: null, maxFee: null }),
    ]);

  return (
    <div
      className="min-h-dvh flex flex-col bg-gray-50 dark:bg-gray-950"
      style={storeThemeCssVars(themeColor)}
    >
      <StoreHeader storeSlug={slug} storeName={merchant.name} initialQuery={q ?? ''} />

      <main className="mx-auto w-full max-w-lg flex-1 px-3 py-3 pb-20 md:max-w-7xl md:px-6 md:py-6 md:pb-10">
        <StoreHero merchant={merchant} productCount={productCount} />

        {showHomeModules && featuredProducts.length > 0 && (
          <div className="mt-4">
            <StoreFeaturedRow products={featuredProducts} />
          </div>
        )}

        {showHomeModules && (
          <div className="mt-4">
            <StoreDeliveryInfo merchant={merchant} zones={zones} shippingHint={shippingHint} />
          </div>
        )}

        <div className="mt-4">
          <Suspense fallback={<div className="h-10" />}>
            <StoreCategoryTabs storeSlug={slug} categories={categories} />
          </Suspense>
        </div>

        <div className="mt-4">
          <StoreProductGrid
            products={products}
            storeSlug={slug}
            q={q}
            categorySlug={categorySlug}
            categories={categories}
          />
        </div>
      </main>

      <ProductsBottomNav />
    </div>
  );
}
