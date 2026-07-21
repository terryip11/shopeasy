import Link from 'next/link';

import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ProductsBottomNav } from '@/components/marketing/products-home/products-bottom-nav';
import { BuyerOrderCard } from '@/components/orders/buyer-order-card';
import { PaginationLinks } from '@/components/ui/pagination-links';
import { getBuyerOrders } from '@/lib/orders/server';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ page?: string; closedPage?: string }> };

export default async function BuyerOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const closedPage = Math.max(1, Number(params.closedPage) || 1);

  const [{ orders, totalCount, totalPages }, { orders: closedOrders, totalCount: closedCount, totalPages: closedTotalPages }] =
    await Promise.all([
      getBuyerOrders(page, 10, 'active'),
      getBuyerOrders(closedPage, 10, 'closed'),
    ]);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 pb-24 sm:px-6 md:pb-12 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的訂單</h1>
        <p className="mt-1 text-sm text-gray-500">
          共 {totalCount} 筆進行中訂單 ·{' '}
          <Link href="/account/addresses" className="text-orange-600 hover:underline">
            管理收貨地址
          </Link>
        </p>

        {orders.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <Package className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">尚無進行中訂單</p>
            <Link href="/products" className="mt-4 text-orange-500 hover:underline">
              去選購商品
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <BuyerOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        <div className="mt-6">
          <PaginationLinks
            basePath="/orders"
            page={page}
            totalPages={totalPages}
            query={closedPage > 1 ? { closedPage: String(closedPage) } : undefined}
          />
        </div>

        {closedCount > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">歷史訂單</h2>
            <p className="mt-1 text-sm text-gray-500">
              {closedCount} 筆（已完成、已取消或已退款）
            </p>
            <div className="mt-4 space-y-4 opacity-90">
              {closedOrders.map((order) => (
                <BuyerOrderCard key={order.id} order={order} showActions={false} />
              ))}
            </div>
            <div className="mt-6">
              <PaginationLinks
                basePath="/orders"
                page={closedPage}
                totalPages={closedTotalPages}
                pageParam="closedPage"
                query={page > 1 ? { page: String(page) } : undefined}
              />
            </div>
          </section>
        )}
      </main>
      <ProductsBottomNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
