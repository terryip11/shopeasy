import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/server';
import { getCourierProfile } from '@/lib/courier/server';
import { getCourierEarningsView } from '@/lib/finance/courier-earnings-view';
import { getCourierPlatformFeeRate } from '@/lib/finance/platform-settings';
import { CourierMobileShell } from '@/components/courier/courier-mobile-shell';
import { CourierEarningsList } from '@/components/courier/courier-earnings-list';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CourierEarningsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login?redirect=/courier/earnings');

  const profile = await getCourierProfile(user.id);
  if (!profile) redirect('/courier/apply');

  if (profile.status !== 'active') {
    return (
      <CourierMobileShell activeTab="earnings" title="我的收入">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">配送員帳號啟用後即可查看收入明細</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/courier">返回配送首頁</Link>
          </Button>
        </div>
      </CourierMobileShell>
    );
  }

  let view: Awaited<ReturnType<typeof getCourierEarningsView>> | null = null;
  let loadError = '';
  let platformFeePercent = 10;

  try {
    const [earningsView, feeRate] = await Promise.all([
      getCourierEarningsView(user.id),
      getCourierPlatformFeeRate(),
    ]);
    view = earningsView;
    platformFeePercent = Math.round(feeRate * 1000) / 10;
  } catch (error) {
    loadError = (error as Error).message;
  }

  const s = view?.summary;

  return (
    <CourierMobileShell activeTab="earnings" title="我的收入">
      <div className="space-y-6">
        <p className="text-xs text-gray-500 leading-relaxed">
          顯示金額為扣除平台服務費（目前 {platformFeePercent}%）後的實收。接單時會鎖定該單抽成比例；已結算紀錄不會因事後調整而改變。送達後記入待結算，每月由平台統一結算。
        </p>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError.includes('courier_delivery_earnings')
              ? '資料庫尚未建立配送員收入表，請聯絡平台管理員'
              : loadError}
          </div>
        )}

        {s && (
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="今日已完成" amount={s.todayAmount} count={s.todayCount} />
            <SummaryTile
              label="本月待結算"
              amount={s.monthPendingAmount}
              count={s.monthPendingCount}
              accent
            />
            <SummaryTile
              label="本月已結算"
              amount={s.monthSettledAmount}
              count={s.monthSettledCount}
            />
            {s.lastSettledAmount != null && s.lastSettledLabel ? (
              <SummaryTile
                label={`${s.lastSettledLabel}已結算`}
                amount={s.lastSettledAmount}
                count={null}
              />
            ) : (
              <SummaryTile label="上月已結算" amount={0} count={null} empty />
            )}
          </div>
        )}

        {s && s.customerRatingCount > 0 && s.customerRatingAvg != null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium text-gray-900 dark:text-white">
              客戶評分 {s.customerRatingAvg.toFixed(1)} 星
            </p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              共 {s.customerRatingCount} 則評分 · 評分達標可獲高評加價
            </p>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">收入明細</h2>
          <div className="mt-3">
            <CourierEarningsList items={view?.recent ?? []} />
          </div>
        </div>
      </div>
    </CourierMobileShell>
  );
}

function SummaryTile({
  label,
  amount,
  count,
  accent,
  empty,
}: {
  label: string;
  amount: number;
  count: number | null;
  accent?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
        }`}
      >
        {empty && amount === 0 ? '—' : `HK$${amount.toFixed(0)}`}
      </p>
      {count != null && <p className="text-xs text-gray-400">{count} 單</p>}
    </div>
  );
}
