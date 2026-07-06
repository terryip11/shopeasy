import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission } from '@/lib/auth/permissions';
import { getAdminMerchantsList, ownerLabel } from '@/lib/admin/merchants';
import { MERCHANT_TIER_LABELS } from '@/lib/merchant/tier-config';
import { AdminMerchantRowActions } from '@/components/admin/admin-merchant-row-actions';
import type { MerchantStatus, MerchantTier } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<MerchantStatus, string> = {
  pending: '待審核',
  active: '營運中',
  rejected: '已拒絕',
  suspended: '已停用',
};

const STATUS_STYLES: Record<MerchantStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  suspended: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default async function AdminMerchantsPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'merchants:read')) {
    redirect('/admin');
  }

  const { merchants, totalCount } = await getAdminMerchantsList(1, 50);
  const canSuspend = hasPermission(role, 'merchants:suspend');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商家管理</h1>
          <p className="mt-1 text-sm text-gray-500">共 {totalCount} 間店鋪</p>
        </div>
        <Link
          href="/admin/merchants/pending"
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          待審核商家 →
        </Link>
      </div>

      <div className="space-y-3 md:hidden">
        {merchants.length > 0 ? (
          merchants.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/merchants/${m.id}`}
                    className="font-medium text-orange-600 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <p className="text-xs text-gray-500">/{m.slug}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}
                >
                  {STATUS_LABELS[m.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-gray-400">負責人</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {ownerLabel(m)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">等級</dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    {MERCHANT_TIER_LABELS[m.tier as MerchantTier] ?? m.tier}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400">聯絡</dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    {m.owner_email || m.contact_email || m.contact_phone || '—'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400">申請時間</dt>
                  <dd className="text-gray-600 dark:text-gray-400">
                    {new Date(m.applied_at).toLocaleString('zh-HK')}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <AdminMerchantRowActions
                  merchantId={m.id}
                  status={m.status}
                  canSuspend={canSuspend}
                />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl bg-white px-4 py-12 text-center text-gray-500 shadow dark:bg-gray-900">
            暫無商家
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>店鋪</TableHead>
              <TableHead>負責人</TableHead>
              <TableHead>聯絡方式</TableHead>
              <TableHead>等級</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>申請時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length > 0 ? (
              merchants.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/admin/merchants/${m.id}`}
                      className="font-medium text-orange-600 hover:underline"
                    >
                      {m.name}
                    </Link>
                    <p className="text-xs text-gray-500">/{m.slug}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ownerLabel(m)}
                    </p>
                    {m.owner_display_name &&
                      m.contact_name &&
                      m.contact_name !== m.owner_display_name && (
                        <p className="text-xs text-gray-400">帳號：{m.owner_display_name}</p>
                      )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(m.owner_email || m.contact_email) && (
                      <p className="text-gray-700 dark:text-gray-300">
                        {m.owner_email || m.contact_email}
                      </p>
                    )}
                    {m.contact_phone && (
                      <p className="text-xs text-gray-500">{m.contact_phone}</p>
                    )}
                    {!m.owner_email && !m.contact_email && !m.contact_phone && (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {MERCHANT_TIER_LABELS[m.tier as MerchantTier] ?? m.tier}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}
                    >
                      {STATUS_LABELS[m.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(m.applied_at).toLocaleString('zh-HK')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminMerchantRowActions
                      merchantId={m.id}
                      status={m.status}
                      canSuspend={canSuspend}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  暫無商家
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
