/**
 * 分類商品列表頁
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ProductCard } from '@/components/marketing/product-card';
import { ProductsBottomNav } from '@/components/marketing/products-home/products-bottom-nav';
import { getCategoryBySlug } from '@/lib/categories';
import { getProductsByCategory } from '@/lib/products';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const products = await getProductsByCategory(slug, 24);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 pb-24 sm:px-6 md:pb-12 lg:px-8">
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          返回全部分類
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
        <p className="mt-1 text-sm text-gray-500">共 {products.length} 件上架商品</p>

        {products.length === 0 ? (
          <p className="mt-8 text-gray-500">此分類暫無上架商品。</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        )}
      </main>
      <ProductsBottomNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
