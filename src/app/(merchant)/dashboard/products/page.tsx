/**
 * 商品管理頁面
 */

import { getMerchantProducts } from '@/lib/merchant/server';
import { ProductActions } from '@/components/merchant/product-actions';
import { PaginationLinks } from '@/components/ui/pagination-links';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { ArrowLeft, Plus, Package } from 'lucide-react';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '上架中',
  archived: '已封存',
};

type ProductRow = Database['public']['Tables']['products']['Row'];

type PageProps = { searchParams: Promise<{ page?: string }> };

function ProductImage({ product }: { product: ProductRow }) {
  if (product.images?.[0]) {
    return (
      <img
        src={product.images[0]}
        alt={product.name}
        className="h-12 w-12 rounded-lg object-cover sm:h-10 sm:w-10"
      />
    );
  }
  return <Package className="h-8 w-8 text-gray-400 sm:h-6 sm:w-6" />;
}

function ProductMobileCard({ product }: { product: ProductRow }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="font-medium text-gray-900 hover:text-orange-600 dark:text-white"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-lg font-bold text-orange-600">HK${product.price}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
              {statusLabels[product.status] || product.status}
            </span>
            <span>
              {new Date(product.created_at).toLocaleDateString('zh-HK')}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
        <ProductActions productId={product.id} />
      </div>
    </article>
  );
}

function ProductDesktopRow({ product }: { product: ProductRow }) {
  return (
    <TableRow>
      <TableCell>
        <ProductImage product={product} />
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>HK${product.price}</TableCell>
      <TableCell>{statusLabels[product.status] || product.status}</TableCell>
      <TableCell>{new Date(product.created_at).toLocaleDateString('zh-HK')}</TableCell>
      <TableCell>
        <ProductActions productId={product.id} />
      </TableCell>
    </TableRow>
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { products, totalCount, totalPages } = await getMerchantProducts(page, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回儀表板
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商品管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            管理您的商品庫存和價格 · 共 {totalCount} 件
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link href="/dashboard/products/new">
            <Plus className="mr-2 h-4 w-4" />
            新增商品
          </Link>
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {products.length > 0 ? (
          products.map((product) => <ProductMobileCard key={product.id} product={product} />)
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            暫無商品，
            <Link href="/dashboard/products/new" className="text-orange-500 hover:underline">
              新增第一件商品
            </Link>
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-gray-800 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>圖片</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead>價格</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>上架時間</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => (
                <ProductDesktopRow key={product.id} product={product} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  暫無商品數據，
                  <Link href="/dashboard/products/new" className="text-orange-500">
                    新增第一件商品
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationLinks basePath="/dashboard/products" page={page} totalPages={totalPages} />
    </div>
  );
}
