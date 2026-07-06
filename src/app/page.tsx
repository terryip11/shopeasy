/**
 * 首頁 — 行銷／銷售頁面
 */

import { Navbar } from '@/components/marketing/navbar';
import { HeroSection } from '@/components/marketing/hero-section';
import { ProductCard } from '@/components/marketing/product-card';
import { CategoryGrid } from '@/components/marketing/category-grid';
import { Footer } from '@/components/marketing/footer';
import { getFeaturedProducts } from '@/lib/products';
import { getCategories } from '@/lib/categories';
import { getFeaturedMerchants } from '@/lib/merchants';
import { ArrowRight, Store, TrendingUp, ShoppingBag, Star } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, categories, merchants] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(6),
    getFeaturedMerchants(4),
  ]);

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="flex-1">
        <HeroSection />

        <section id="categories" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">熱門分類</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                瀏覽各類精選商品，發現心儀好物
              </p>
            </div>
            <Link
              href="/categories"
              className="hidden items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 sm:flex"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryGrid categories={categories} />
        </section>

        <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">熱銷商品</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  精心挑選的優質商品，品質保證
                </p>
              </div>
            </div>
            <Link
              href="/products"
              className="hidden items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 sm:flex"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  images={product.images}
                  merchantName={product.merchants?.name}
                  categoryName={product.categories?.name}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">暫無商品</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                商家正在積極上架商品，敬請期待
              </p>
            </div>
          )}
        </section>

        <section id="merchants" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Store className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">熱門店鋪</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">值得信賴的優質商家</p>
            </div>
          </div>

          {merchants.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {merchants.map((merchant) => (
                <Link
                  key={merchant.id}
                  href={`/stores/${merchant.slug}`}
                  className="group flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:bg-gray-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xl font-bold">
                    {merchant.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{merchant.name}</h3>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">優質商家</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <Store className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">暫無商家</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                商家正在入駐中，敬請期待
              </p>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-16 sm:px-16">
            <div className="relative z-10 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">想成為商家？</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
                加入 ShopEasy，開啟您的電商之旅。我們提供完善的店鋪管理工具與海量流量支援。
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/merchant/apply"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-orange-500 shadow-lg transition-all hover:bg-gray-50"
                >
                  立即入駐
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/merchant/apply"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                  了解更多
                </Link>
              </div>
            </div>

            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
