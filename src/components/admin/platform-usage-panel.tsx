import Link from 'next/link';
import type { PlatformUsageStats } from '@/lib/admin/platform-usage';

type Props = {
  stats: PlatformUsageStats;
  compact?: boolean;
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: 'orange' | 'blue' | 'green' | 'indigo';
}) {
  const accentClass =
    accent === 'orange'
      ? 'bg-orange-50 dark:bg-orange-900/20'
      : accent === 'blue'
        ? 'bg-blue-50 dark:bg-blue-900/20'
        : accent === 'green'
          ? 'bg-green-50 dark:bg-green-900/20'
          : accent === 'indigo'
            ? 'bg-indigo-50 dark:bg-indigo-900/20'
            : 'bg-white dark:bg-gray-900';

  return (
    <div className={`rounded-xl p-5 shadow-sm ${accentClass}`}>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

function UsageTable({
  title,
  rows,
  periodKey,
  periodLabelKey,
}: {
  title: string;
  rows: Array<{
    [key: string]: string | number;
    newSignups: number;
    loginActive: number;
    orderActive: number;
  }>;
  periodKey: string;
  periodLabelKey: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500 dark:border-gray-800">
            <th className="px-5 py-3">期間</th>
            <th className="px-5 py-3">新增註冊</th>
            <th className="px-5 py-3">活躍登入</th>
            <th className="px-5 py-3">活躍下單</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...rows].reverse().map((row) => (
            <tr key={String(row[periodKey])}>
              <td className="px-5 py-2.5 font-medium">{row[periodLabelKey]}</td>
              <td className="px-5 py-2.5">{row.newSignups}</td>
              <td className="px-5 py-2.5">{row.loginActive}</td>
              <td className="px-5 py-2.5">{row.orderActive}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlatformUsagePanel({ stats, compact = false }: Props) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">平台用戶使用統計</h2>
          <p className="mt-1 text-sm text-gray-500">
            香港時間 · 活躍登入＝當日／當月有登入紀錄的帳號 · 活躍下單＝有建立訂單的買家
          </p>
        </div>
        {compact ? (
          <Link href="/admin/usage" className="text-sm font-medium text-orange-600 hover:underline">
            查看完整報表 →
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="總註冊用戶" value={stats.totalUsers} accent="indigo" />
        <StatCard
          label="今日新增註冊"
          value={stats.today.newSignups}
          sub="今日"
          accent="green"
        />
        <StatCard
          label="今日活躍登入"
          value={stats.today.loginActive}
          sub="今日"
          accent="blue"
        />
        <StatCard
          label="今日活躍下單"
          value={stats.today.orderActive}
          sub="今日"
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={`${stats.month.label} 新增註冊`}
          value={stats.month.newSignups}
          accent="green"
        />
        <StatCard
          label={`${stats.month.label} 活躍登入`}
          value={stats.month.loginActive}
          accent="blue"
        />
        <StatCard
          label={`${stats.month.label} 活躍下單`}
          value={stats.month.orderActive}
          accent="orange"
        />
      </div>

      {!compact && (
        <>
          <UsageTable
            title="近 30 日（每日）"
            rows={stats.dailySeries}
            periodKey="day"
            periodLabelKey="dayLabel"
          />
          <UsageTable
            title="近 12 個月（每月）"
            rows={stats.monthlySeries}
            periodKey="month"
            periodLabelKey="monthLabel"
          />
        </>
      )}

      <p className="text-xs text-gray-400">
        統計時間：{new Date(stats.generatedAt).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}
      </p>
    </section>
  );
}
