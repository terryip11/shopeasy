/**
 * 分類列表頁
 */

import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { CategoryGrid } from '@/components/marketing/category-grid';
import { getCategories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories(50);

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">商品分類</h1>
        <div className="mt-8">
          <CategoryGrid categories={categories} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
