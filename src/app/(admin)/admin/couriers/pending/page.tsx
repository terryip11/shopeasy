import { createAdminClient } from '@/lib/supabase/admin';
import { getPendingCourierApplications } from '@/lib/courier/server';
import { CourierApprovalList } from '@/components/admin/courier-approval-list';
import { getUserRole } from '@/lib/auth/server';
import { hasPermission } from '@/lib/auth/permissions';
import { getAdminDeliveryZones } from '@/lib/admin/couriers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminCouriersPendingPage() {
  const role = await getUserRole();
  if (!hasPermission(role, 'couriers:manage')) {
    redirect('/admin');
  }

  const applications = await getPendingCourierApplications();
  const supabase = createAdminClient();
  const zones = await getAdminDeliveryZones();
  const zoneNameById = Object.fromEntries(zones.map((z) => [z.id, z.name]));

  const userIds = applications.map((a) => a.user_id);
  const displayNames: Record<string, string | null> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    for (const p of profiles || []) {
      const row = p as { id: string; display_name: string | null };
      displayNames[row.id] = row.display_name;
    }
  }

  return (
    <div>
      <Link href="/admin/couriers" className="text-sm text-orange-600 hover:underline">
        ← 返回配送員管理
      </Link>
      <h1 className="mt-2 text-2xl font-bold mb-2">配送員審核</h1>
      <p className="text-sm text-gray-500 mb-6">
        審核通過後將自動授予對應 capability（送餐員 / 送貨員）
      </p>
      <CourierApprovalList
        applications={applications}
        displayNames={displayNames}
        zoneNameById={zoneNameById}
      />
    </div>
  );
}
