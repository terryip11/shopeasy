import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission } from '@/lib/auth/permissions';
import { getAdminCategoriesList } from '@/lib/admin/categories';
import { AdminCategoryRowActions } from '@/components/admin/admin-category-row-actions';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'categories:read')) {
    redirect('/admin');
  }

  const { categories, totalCount } = await getAdminCategoriesList(1, 100);
  const canWrite = hasPermission(role, 'categories:write');
  const canDelete = hasPermission(role, 'categories:delete');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">分類管理</h1>
          <p className="mt-1 text-sm text-gray-500">共 {totalCount} 個分類</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/admin/categories/new">
              <Plus className="mr-2 h-4 w-4" />
              新增分類
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分類名稱</TableHead>
              <TableHead>網址代稱</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/categories/${c.id}`}
                      className="font-medium text-gray-900 hover:text-orange-600 dark:text-white"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-500">/{c.slug}</TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString('zh-HK')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminCategoryRowActions
                      categoryId={c.id}
                      categoryName={c.name}
                      canDelete={canDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                  尚無分類
                  {canWrite && (
                    <>
                      {' '}
                      ·{' '}
                      <Link href="/admin/categories/new" className="text-orange-600 hover:underline">
                        新增第一個分類
                      </Link>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
