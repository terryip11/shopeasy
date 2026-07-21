import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/server';
import {
  getCourierProfile,
  getUserCapabilities,
} from '@/lib/courier/server';
import { createClient } from '@/lib/supabase/server';
import { CourierMobileShell } from '@/components/courier/courier-mobile-shell';
import { CourierPayoutForm } from '@/components/courier/courier-payout-form';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import { COURIER_STATUS_LABELS, VEHICLE_LABELS } from '@/lib/courier/types';
import { Button } from '@/components/ui/button';
import type { DeliveryJobType } from '@/lib/auth/capabilities';

export const dynamic = 'force-dynamic';

export default async function CourierProfilePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login?redirect=/courier/profile');

  const [profile, capabilities] = await Promise.all([
    getCourierProfile(user.id),
    getUserCapabilities(user.id),
  ]);

  if (!profile) {
    return (
      <CourierMobileShell activeTab="profile" title="配送員資料">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">您尚未申請成為配送員</p>
          <Button asChild className="mt-4 w-full">
            <Link href="/courier/apply">前往申請入駐</Link>
          </Button>
        </div>
      </CourierMobileShell>
    );
  }

  const supabase = await createClient();
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    (userProfile as { display_name: string | null } | null)?.display_name?.trim() ||
    user.email?.split('@')[0] ||
    '配送員';

  const courierRow = profile as {
    phone: string | null;
    vehicle_type: keyof typeof VEHICLE_LABELS | null;
    preferred_job_type: DeliveryJobType | 'both' | null;
    status: keyof typeof COURIER_STATUS_LABELS;
    zone_ids: string[];
    customer_rating_avg: number | null;
    customer_rating_count: number;
    reject_reason: string | null;
    is_online: boolean;
    payout_account_holder?: string | null;
    payout_fps_id?: string | null;
  };

  const jobType: DeliveryJobType =
    courierRow.preferred_job_type === 'food'
      ? 'food'
      : courierRow.preferred_job_type === 'parcel'
        ? 'parcel'
        : capabilities.includes('food_courier')
          ? 'food'
          : 'parcel';

  const capabilityLabels: string[] = [];
  if (capabilities.includes('food_courier')) capabilityLabels.push(JOB_TYPE_LABELS.food);
  if (capabilities.includes('parcel_courier')) capabilityLabels.push(JOB_TYPE_LABELS.parcel);

  return (
    <CourierMobileShell activeTab="profile" title="配送員資料">
      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">基本資料</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="顯示名稱" value={displayName} />
            <Row label="聯絡電話" value={courierRow.phone || '—'} />
            <Row
              label="交通工具"
              value={
                courierRow.vehicle_type
                  ? VEHICLE_LABELS[courierRow.vehicle_type]
                  : '—'
              }
            />
            <Row label="帳號狀態" value={COURIER_STATUS_LABELS[courierRow.status]} />
            <Row
              label="配送類型"
              value={capabilityLabels.length > 0 ? capabilityLabels.join('、') : '—'}
            />
            {courierRow.customer_rating_count > 0 &&
              courierRow.customer_rating_avg != null && (
                <Row
                  label="客戶評分"
                  value={`${Number(courierRow.customer_rating_avg).toFixed(1)} 星（${courierRow.customer_rating_count} 則）`}
                />
              )}
          </dl>

          {courierRow.status === 'rejected' && courierRow.reject_reason && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              拒絕原因：{courierRow.reject_reason}
            </p>
          )}

          {courierRow.status === 'rejected' && (
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={`/courier/${jobType}/apply`}>重新申請</Link>
            </Button>
          )}

          {courierRow.status === 'pending' && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              申請審核中，通過後即可於工作台接單。
            </p>
          )}
        </section>

        {courierRow.status === 'active' && (
          <CourierPayoutForm
            initialHolder={courierRow.payout_account_holder?.trim() || ''}
            initialFpsId={courierRow.payout_fps_id?.trim() || ''}
          />
        )}
      </div>
    </CourierMobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}
