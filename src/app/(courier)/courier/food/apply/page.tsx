import Link from 'next/link';
import { CourierApplyForm } from '@/components/courier/courier-apply-form';
import { CourierMobileShell } from '@/components/courier/courier-mobile-shell';
import { getDeliveryZones, getCourierProfile } from '@/lib/courier/server';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function FoodCourierApplyPage() {
  const [zones, profile] = await Promise.all([getDeliveryZones(), getCourierProfile()]);

  if (profile?.status === 'active') {
    return (
      <CourierMobileShell variant="food" activeTab="hub" title="已是配送員" showBack>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-bold">您已是配送員</h2>
          <Button asChild className="mt-4 w-full">
            <Link href="/courier/food">前往送餐工作台</Link>
          </Button>
        </div>
      </CourierMobileShell>
    );
  }

  if (profile?.status === 'pending') {
    return (
      <CourierMobileShell variant="food" activeTab="hub" title="審核中" showBack>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-bold">申請審核中</h2>
          <p className="mt-2 text-sm text-gray-500">請耐心等待平台審核。</p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/courier/food">查看狀態</Link>
          </Button>
        </div>
      </CourierMobileShell>
    );
  }

  return <CourierApplyForm zones={zones} jobType="food" />;
}
