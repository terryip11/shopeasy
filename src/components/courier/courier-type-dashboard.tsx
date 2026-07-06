import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getCourierProfile,
  getAvailableJobsForCourier,
  getCourierActiveJobs,
  getUserCapabilities,
  getDeliveryZones,
} from '@/lib/courier/server';
import { enrichDeliveryJobsWithPayout } from '@/lib/delivery/enrich-job-payout';
import { CourierJobList } from '@/components/courier/courier-job-list';
import { OnlineToggle } from '@/components/courier/online-toggle';
import { CourierZoneSettings } from '@/components/courier/courier-zone-settings';
import { CourierMobileShell } from '@/components/courier/courier-mobile-shell';
import { COURIER_STATUS_LABELS } from '@/lib/courier/types';
import { capabilityForJobType, type DeliveryJobType } from '@/lib/auth/capabilities';
import { Button } from '@/components/ui/button';

type Props = {
  jobType: DeliveryJobType;
};

export async function CourierTypeDashboard({ jobType }: Props) {
  const profile = await getCourierProfile();
  const applyHref = `/courier/${jobType}/apply`;
  const requiredCapability = capabilityForJobType(jobType);
  const typeLabel = jobType === 'food' ? '送餐員' : '送貨員';

  if (!profile) {
    redirect(applyHref);
  }

  if (profile.status === 'pending') {
    if (profile.preferred_job_type && profile.preferred_job_type !== jobType) {
      const other =
        profile.preferred_job_type === 'food'
          ? '送餐員'
          : profile.preferred_job_type === 'parcel'
            ? '送貨員'
            : '另一類型';
      return (
        <CourierMobileShell variant={jobType} activeTab="work" title="審核中">
          <StatusCard title="申請審核中">
            <p className="text-sm text-gray-500">
              您已提交{other}申請，正在審核中。通過後可於對應工作台接單。
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/courier">返回配送首頁</Link>
            </Button>
          </StatusCard>
        </CourierMobileShell>
      );
    }

    return (
      <CourierMobileShell variant={jobType} activeTab="work" title="審核中">
        <StatusCard title="申請審核中">
          <p className="text-sm text-gray-500">
            您的{typeLabel}申請正在審核，通過後即可上線接單。
          </p>
        </StatusCard>
      </CourierMobileShell>
    );
  }

  if (profile.status === 'rejected') {
    return (
      <CourierMobileShell variant={jobType} activeTab="work" title="申請未通過">
        <StatusCard title="申請未通過">
          {profile.reject_reason && (
            <p className="text-sm text-red-600">原因：{profile.reject_reason}</p>
          )}
          <Button asChild className="mt-4 w-full">
            <Link href={applyHref}>重新申請</Link>
          </Button>
        </StatusCard>
      </CourierMobileShell>
    );
  }

  if (profile.status === 'suspended') {
    return (
      <CourierMobileShell variant={jobType} activeTab="work" title="帳號已停用">
        <StatusCard title="帳號已停用">
          <p className="text-sm text-gray-500">請聯絡平台客服。</p>
        </StatusCard>
      </CourierMobileShell>
    );
  }

  const capabilities = await getUserCapabilities();

  if (!capabilities.includes(requiredCapability)) {
    return (
      <CourierMobileShell variant={jobType} activeTab="work" title="尚未開通">
        <StatusCard title={`尚未具備${typeLabel}資格`}>
          <p className="text-sm text-gray-500">
            您的配送員帳號已啟用，但尚未獲得{typeLabel}權限。如需增補，請聯絡平台管理員。
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/courier">返回配送首頁</Link>
          </Button>
        </StatusCard>
      </CourierMobileShell>
    );
  }

  const [availableResult, mine, allZones] = await Promise.all([
    getAvailableJobsForCourier(jobType),
    getCourierActiveJobs(jobType),
    getDeliveryZones(),
  ]);

  const { jobs: available, outsideZoneCount, zoneNames } = availableResult;

  const [availableWithPayout, mineWithPayout] = await Promise.all([
    enrichDeliveryJobsWithPayout(available, profile.user_id),
    enrichDeliveryJobsWithPayout(mine, profile.user_id),
  ]);

  return (
    <CourierMobileShell variant={jobType} activeTab="work" title="工作台">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{typeLabel}</p>
            <p className="text-xs text-gray-500">
              {COURIER_STATUS_LABELS[profile.status]} · {profile.is_online ? '上線中' : '離線'}
              {zoneNames.length > 0 && ` · 服務區域：${zoneNames.join('、')}`}
            </p>
          </div>
          <OnlineToggle isOnline={profile.is_online} />
        </div>

        <CourierZoneSettings
          zones={allZones}
          selectedZoneIds={profile.zone_ids}
          jobType={jobType}
        />

        <CourierJobList
          available={availableWithPayout}
          mine={mineWithPayout}
          isOnline={profile.is_online}
          jobType={jobType}
          outsideZoneCount={outsideZoneCount}
          zoneNames={zoneNames}
        />
      </div>
    </CourierMobileShell>
  );
}

function StatusCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
