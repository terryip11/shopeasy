import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUserRole } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getAdminOrderTraceList } from '@/lib/admin/order-trace';
import { AdminOrderTraceTable } from '@/components/admin/admin-order-trace-table';
import { AdminOrderTraceSearch } from '@/components/admin/admin-order-trace-search';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminOrderTracePage({ searchParams }: PageProps) {
  const role = await getUserRole();
  if (!isSuperAdmin(role)) {
    redirect('/admin');
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();

  const { rows, totalCount, totalPages } = await getAdminOrderTraceList(page, 20, q);

  const issueCount = rows.filter((r) => r.issues.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">訂單流程追查</h1>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            全權管理員
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          追蹤下單 → 付款 → 配送任務 → 配送進度 → 商家發貨 → 財務分錄 → 配送酬劳，並標示流程異常。
        </p>
        <p className="mt-1 text-sm text-gray-500">
          共 {totalCount} 筆訂單
          {rows.length > 0 && issueCount > 0 && (
            <span className="ml-2 text-amber-600">本頁 {issueCount} 筆有異常</span>
          )}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900">
        <Suspense fallback={null}>
          <AdminOrderTraceSearch defaultQuery={q} />
        </Suspense>
      </div>

      <AdminOrderTraceTable rows={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/orders/trace?${new URLSearchParams({
                ...(q ? { q } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="text-orange-600 hover:underline"
            >
              上一頁
            </Link>
          ) : (
            <span className="text-gray-300">上一頁</span>
          )}
          <span className="text-gray-500">
            第 {page} / {totalPages} 頁
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/orders/trace?${new URLSearchParams({
                ...(q ? { q } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="text-orange-600 hover:underline"
            >
              下一頁
            </Link>
          ) : (
            <span className="text-gray-300">下一頁</span>
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
        <p className="font-medium text-gray-700 dark:text-gray-300">圖例</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>✓ 已完成</li>
          <li>● 進行中</li>
          <li>○ 尚未開始</li>
          <li>! 異常或資料缺失</li>
          <li>— 不適用（如已取消）</li>
        </ul>
      </div>
    </div>
  );
}
