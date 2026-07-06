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

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '上架中',
  archived: '已封存',
};

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { products, totalCount, totalPages } = await getMerchantProducts(page, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回儀表板
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商品管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理您的商品庫存和價格</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4 mr-2" />
            新增商品
          </Link>
        </Button>
      </div>

      <div className="text-sm text-gray-500">總計 {totalCount} 件商品</div>

      <div className="rounded-2xl bg-white shadow-sm dark:bg-gray-800">
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
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>{statusLabels[product.status] || product.status}</TableCell>
                  <TableCell>
                    {new Date(product.created_at).toLocaleDateString('zh-TW')}
                  </TableCell>
                  <TableCell>
                    <ProductActions productId={product.id} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  暫無商品數據，<Link href="/dashboard/products/new" className="text-orange-500">新增第一件商品</Link>
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
