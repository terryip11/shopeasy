'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  AdminOverdueMerchantRow,
  PayoutOverdueThresholds,
  PayoutUnpaidReportRow,
} from '@/lib/merchant/payout-compliance';

type Props = {
  initialThresholds: PayoutOverdueThresholds;
  initialMerchants: AdminOverdueMerchantRow[];
  initialReports: PayoutUnpaidReportRow[];
};

export function AdminPayoutOverduePanel({
  initialThresholds,
  initialMerchants,
  initialReports,
}: Props) {
  const router = useRouter();
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [merchants, setMerchants] = useState(initialMerchants);
  const [reports, setReports] = useState(initialReports);
  const [remindDays, setRemindDays] = useState(String(initialThresholds.remindDays));
  const [blockDays, setBlockDays] = useState(String(initialThresholds.blockDays));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    const res = await fetch('/api/admin/finance/payout-overdue');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '重新載入失敗');
    setThresholds(data.thresholds);
    setMerchants(data.merchants || []);
    setReports(data.openReports || []);
    setRemindDays(String(data.thresholds.remindDays));
    setBlockDays(String(data.thresholds.blockDays));
    router.refresh();
  };

  const patch = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setError('');
    try {
      const res = await fetch('/api/admin/finance/payout-overdue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失敗');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">逾期門檻</h2>
        <p className="mt-1 text-sm text-gray-500">
          目前：提醒 ≥ {thresholds.remindDays} 天 · 限制配送 ≥ {thresholds.blockDays} 天。平台不代墊工資。
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">提醒天數</span>
            <Input
              type="number"
              min={1}
              max={90}
              value={remindDays}
              onChange={(e) => setRemindDays(e.target.value)}
              className="w-28"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-gray-600">限制天數</span>
            <Input
              type="number"
              min={1}
              max={90}
              value={blockDays}
              onChange={(e) => setBlockDays(e.target.value)}
              className="w-28"
            />
          </label>
          <Button
            disabled={busy === 'thresholds'}
            onClick={() =>
              void patch(
                {
                  action: 'thresholds',
                  remindDays: Number(remindDays),
                  blockDays: Number(blockDays),
                },
                'thresholds'
              )
            }
          >
            儲存門檻
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">逾期商家</h2>
        {merchants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
            目前沒有達提醒門檻的商家
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {merchants.map((m) => (
              <li key={m.merchantId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{m.merchantName}</p>
                  <p className="text-xs text-gray-500">
                    最長逾期 {m.maxOverdueDays} 天 · {m.overdueCount} 筆 · HK$
                    {m.pendingAmount.toFixed(2)}
                    {m.openReports > 0 ? ` · ${m.openReports} 則未付回報` : ''}
                    {m.deliveryBlocked
                      ? ' · 已限制配送'
                      : m.manualUnblock
                        ? ' · 已暫時解除（覆寫中）'
                        : ''}
                  </p>
                </div>
                <Button
                  variant={m.deliveryBlocked ? 'outline' : 'destructive'}
                  size="sm"
                  disabled={busy === `block-${m.merchantId}`}
                  onClick={() =>
                    void patch(
                      {
                        action: 'block',
                        merchantId: m.merchantId,
                        blocked: !m.deliveryBlocked,
                        reason: m.deliveryBlocked
                          ? '管理員暫時解除配送限制'
                          : '管理員手動限制配送',
                      },
                      `block-${m.merchantId}`
                    )
                  }
                >
                  {m.deliveryBlocked ? '暫時解除限制' : '手動限制配送'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">未付回報（待處理）</h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
            暫無開放中的回報
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.reporter_role === 'promoter' ? '分享員' : '配送員'} ·{' '}
                  {r.earning_type === 'promoter' ? '佣金' : '工資'} HK${r.amount.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  商家 {r.merchant_id.slice(0, 8)}
                  {r.order_id ? ` · 訂單 ${r.order_id.slice(0, 8)}` : ''} ·{' '}
                  {new Date(r.created_at).toLocaleString('zh-HK')}
                </p>
                {r.note && <p className="mt-2 text-sm text-gray-600">{r.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy === `resolve-${r.id}`}
                    onClick={() =>
                      void patch(
                        {
                          action: 'resolve_report',
                          reportId: r.id,
                          status: 'resolved',
                          adminNote: '已跟進結案',
                        },
                        `resolve-${r.id}`
                      )
                    }
                  >
                    標記已處理
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === `dismiss-${r.id}`}
                    onClick={() =>
                      void patch(
                        {
                          action: 'resolve_report',
                          reportId: r.id,
                          status: 'dismissed',
                          adminNote: '駁回／無需跟進',
                        },
                        `dismiss-${r.id}`
                      )
                    }
                  >
                    駁回
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
