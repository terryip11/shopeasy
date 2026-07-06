import Link from 'next/link';
import { Bike, Package, ChevronRight } from 'lucide-react';
import { getCourierProfile, getUserCapabilities } from '@/lib/courier/server';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CourierHubPage() {
  const [profile, capabilities] = await Promise.all([
    getCourierProfile(),
    getUserCapabilities(),
  ]);

  const hasFood = capabilities.includes('food_courier');
  const hasParcel = capabilities.includes('parcel_courier');
  const isActive = profile?.status === 'active';

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">配送員中心</h1>
        <p className="mt-1 text-sm text-gray-500">
          選擇送餐或送貨工作台，手機上線接單更方便。
        </p>
      </div>

      {profile?.status === 'pending' && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          您有配送員申請正在審核中，通過後即可使用對應工作台。
        </div>
      )}

      <div className="space-y-4">
        <CourierTypeCard
          href="/courier/food"
          applyHref="/courier/food/apply"
          icon={Bike}
          title="送餐員"
          description="外賣、餐飲即時配送"
          accent="amber"
          hasAccess={isActive && hasFood}
          canApply={!profile || profile.status === 'rejected'}
        />
        <CourierTypeCard
          href="/courier/parcel"
          applyHref="/courier/parcel/apply"
          icon={Package}
          title="送貨員"
          description="網購包裹、貨物配送"
          accent="sky"
          hasAccess={isActive && hasParcel}
          canApply={!profile || profile.status === 'rejected'}
        />
      </div>

      {!profile && (
        <p className="mt-6 text-center text-xs text-gray-500">
          申請時須上傳香港身份證並同意入駐聲明
        </p>
      )}
    </div>
  );
}

function CourierTypeCard({
  href,
  applyHref,
  icon: Icon,
  title,
  description,
  accent,
  hasAccess,
  canApply,
}: {
  href: string;
  applyHref: string;
  icon: typeof Bike;
  title: string;
  description: string;
  accent: 'amber' | 'sky';
  hasAccess: boolean;
  canApply: boolean;
}) {
  const accentClasses =
    accent === 'amber'
      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/40 dark:to-gray-900'
      : 'border-sky-200 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/50 dark:from-sky-950/40 dark:to-gray-900';
  const iconBg = accent === 'amber' ? 'bg-amber-500' : 'bg-sky-500';

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accentClasses}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${iconBg}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-11 flex-1 text-base">
          <Link href={href}>
            {hasAccess ? '進入工作台' : '查看狀態'}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        {canApply && (
          <Button asChild variant="outline" className="h-11 flex-1 text-base">
            <Link href={applyHref}>申請入駐</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
