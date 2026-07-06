import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission } from '@/lib/auth/permissions';
import { getAdminDeliveryZones } from '@/lib/admin/couriers';
import { AdminDeliveryZonesManager } from '@/components/admin/admin-delivery-zones-manager';

export const dynamic = 'force-dynamic';

export default async function AdminDeliveryZonesPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'couriers:manage')) {
    redirect('/admin');
  }

  const zones = await getAdminDeliveryZones();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/couriers" className="text-sm text-orange-600 hover:underline">
          ← 返回配送員管理
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">配送區域設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理香港大區與 18 區；買家結帳、配送員申請與派單均依此區域匹配。共 {zones.length}{' '}
          個區域。
        </p>
      </div>

      <AdminDeliveryZonesManager zones={zones} />
    </div>
  );
}
