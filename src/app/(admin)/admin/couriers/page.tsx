import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission, isSuperAdmin } from '@/lib/auth/permissions';
import {
  getAdminCouriersList,
  getAdminDeliveryZones,
  getPendingCourierCount,
} from '@/lib/admin/couriers';
import { getAdminRatingSurchargeRules } from '@/lib/admin/courier-rating-rules';
import { getCourierMinBaseFees } from '@/lib/finance/platform-settings';
import { AdminCourierEditDialog } from '@/components/admin/admin-courier-edit-dialog';
import { AdminCourierRatingRulesManager } from '@/components/admin/admin-courier-rating-rules-manager';
import { AdminCourierMinBaseFeeForm } from '@/components/admin/admin-courier-min-base-fee-form';
import { COURIER_STATUS_LABELS, VEHICLE_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { CourierProfileStatus } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<CourierProfileStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
};

function capabilityLabel(caps: string[]) {
  const labels: string[] = [];
  if (caps.includes('food_courier')) labels.push(JOB_TYPE_LABELS.food);
  if (caps.includes('parcel_courier')) labels.push(JOB_TYPE_LABELS.parcel);
  return labels.join('、') || '—';
}

export default async function AdminCouriersPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'couriers:read')) {
    redirect('/admin');
  }

  const canManage = hasPermission(role, 'couriers:manage');
  const superAdmin = isSuperAdmin(role);

  const [couriers, zones, pendingCount, ratingRulesResult, minBaseFeeResult] =
    await Promise.all([
    getAdminCouriersList(),
    getAdminDeliveryZones(),
    getPendingCourierCount(),
    canManage
      ? getAdminRatingSurchargeRules()
          .then((rules) => ({ rules, error: '' as string }))
          .catch((error) => ({ rules: [] as Awaited<ReturnType<typeof getAdminRatingSurchargeRules>>, error: (error as Error).message }))
      : Promise.resolve(null),
    superAdmin
      ? getCourierMinBaseFees()
          .then((fees) => ({ fees, error: '' as string }))
          .catch((error) => ({ fees: { food: 0, parcel: 0 }, error: (error as Error).message }))
      : Promise.resolve(null),
  ]);

  const ratingRules = ratingRulesResult?.rules ?? [];
  const ratingRulesError = ratingRulesResult?.error ?? '';
  const minBaseFees = minBaseFeeResult?.fees ?? { food: 0, parcel: 0 };
  const minBaseFeeError = minBaseFeeResult?.error ?? '';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">配送員管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            調整服務區域、配送類型、收入規則與帳號狀態 · 共 {couriers.length} 位
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {canManage && pendingCount > 0 && (
            <Link href="/admin/couriers/pending" className="font-medium text-orange-600 hover:underline">
              待審核 {pendingCount} 人 →
            </Link>
          )}
          {canManage && (
            <Link href="/admin/couriers/zones" className="font-medium text-orange-600 hover:underline">
              配送區域設定 →
            </Link>
          )}
        </div>
      </div>

      {canManage && (
        <section
          id="courier-rating-rules"
          className="scroll-mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">配送員評分加價規則</h2>
            <p className="mt-1 text-sm text-gray-500">
              客戶在訂單<strong>送達後</strong>對配送員評分（1–5 星），累積為配送員的客戶評分。
              當配送員歷史平均評分<strong>較高</strong>且達到門檻時，接單可獲額外加價（平台補貼激勵）。
            </p>
          </div>

          {ratingRulesError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ratingRulesError.includes('courier_buyer_rating_surcharges')
                ? '資料庫尚未建立評分加價規則表，請執行 supabase/migrate-v23-shipping-buyer-rating.sql'
                : ratingRulesError}
            </div>
          )}

          <AdminCourierRatingRulesManager rules={ratingRules} />
        </section>
      )}

      {superAdmin && (
        <section
          id="courier-min-base-fee"
          className="scroll-mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">配送員最低基本工資</h2>
            <p className="mt-1 text-sm text-gray-500">
              平台保底收入：商家或商品設定過低時，仍以此金額作為配送員基本工資（目前送餐 HK$
              {minBaseFees.food.toFixed(0)}、送貨 HK${minBaseFees.parcel.toFixed(0)}）。僅全權管理員可調整。
            </p>
          </div>

          {minBaseFeeError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {minBaseFeeError.includes('platform_settings')
                ? '請執行 supabase/migrate-v30-courier-min-base-fee.sql'
                : minBaseFeeError}
            </div>
          )}

          <AdminCourierMinBaseFeeForm
            initialFood={minBaseFees.food}
            initialParcel={minBaseFees.parcel}
          />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">配送員列表</h2>
        <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>配送員</TableHead>
                <TableHead>聯絡</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>服務區域</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>上線</TableHead>
                {canManage && <TableHead className="text-right">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers.length > 0 ? (
                couriers.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {c.display_name || c.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{c.user_id.slice(0, 8)}</p>
                    </TableCell>
                    <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                    <TableCell className="text-sm">
                      <p>{capabilityLabel(c.capabilities)}</p>
                      {c.vehicle_type && (
                        <p className="text-xs text-gray-500">
                          {VEHICLE_LABELS[c.vehicle_type as keyof typeof VEHICLE_LABELS]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[14rem] text-sm text-gray-600">
                      {c.zone_names.length > 0 ? c.zone_names.join('、') : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}
                      >
                        {COURIER_STATUS_LABELS[c.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.is_online ? (
                        <span className="text-green-600">上線</span>
                      ) : (
                        <span className="text-gray-400">離線</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <AdminCourierEditDialog courier={c} zones={zones} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center text-gray-500">
                    暫無已啟用配送員
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
