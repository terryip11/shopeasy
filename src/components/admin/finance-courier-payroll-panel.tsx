'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { CourierPayrollPreview } from '@/lib/finance/courier-payroll';

type Props = {
  preview: CourierPayrollPreview;
  /** 商家直付時隱藏平台代發結算按鈕 */
  merchantDirect?: boolean;
};

export function FinanceCourierPayrollPanel({ preview, merchantDirect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const settled = preview.existingRun?.status === 'settled';

  const settle = async () => {
    if (
      !confirm(
        `確認結算 ${preview.periodStart.slice(0, 7)} 配送員工資？\n共 ${preview.courierCount} 人、${preview.pendingCount} 單、HK$${preview.pendingAmount.toFixed(2)}`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/finance/courier-payroll/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_start: preview.periodStart }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) router.refresh();
    else alert(data.error || '結算失敗');
  };

  const backfill = async () => {
    setBackfillLoading(true);
    const res = await fetch('/api/admin/finance/courier-earnings/backfill', { method: 'POST' });
    const data = await res.json();
    setBackfillLoading(false);
    if (res.ok) {
      alert(`已補建 ${data.created} 筆，略過 ${data.skipped} 筆`);
      router.refresh();
    } else {
      alert(data.error || '補建失敗');
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {merchantDirect ? '配送員工資（記帳參考）' : '配送員月薪結算'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {merchantDirect
              ? '商家直付模式下，工資由商家 FPS 支付並標記已付；此處僅供對帳，平台不代發。'
              : '每完成一單即記帳工資（金額依商家設定）；建議每月 5 號結算上月'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={backfillLoading} onClick={() => void backfill()}>
            {backfillLoading ? '補建中...' : '補建歷史配送記帳'}
          </Button>
          {!merchantDirect && !settled && preview.pendingCount > 0 && (
            <Button size="sm" disabled={loading} onClick={() => void settle()}>
              {loading ? '結算中...' : `結算 ${preview.periodStart.slice(0, 7)} 工資`}
            </Button>
          )}
        </div>
      </div>

      {merchantDirect && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          請勿使用平台「結算工資」。未付跟進請至
          <a href="/admin/finance/payout-overdue" className="mx-1 font-medium underline">
            逾期未付
          </a>
          。
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
          <p className="text-gray-500">
            {merchantDirect ? '期間記帳' : `待結算`}（{preview.periodStart.slice(0, 7)}）
          </p>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
            HK${preview.pendingAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {preview.pendingCount} 單 · {preview.courierCount} 人
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-gray-500">結算期間</p>
          <p className="font-medium">
            {preview.periodStart} ~ {preview.periodEnd}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-gray-500">狀態</p>
          <p className="font-medium">
            {merchantDirect
              ? '商家直付（非平台代發）'
              : settled
                ? `已結算（${preview.existingRun?.settled_at ? new Date(preview.existingRun.settled_at).toLocaleString('zh-HK') : '—'}）`
                : preview.pendingCount > 0
                  ? '待結算'
                  : '無待結算記錄'}
          </p>
        </div>
      </div>

      {preview.byCourier.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">配送員</th>
                <th className="py-2 pr-4">完成單數</th>
                <th className="py-2">應發工資</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.byCourier.map((c) => (
                <tr key={c.courier_id}>
                  <td className="py-3 pr-4">{c.display_name}</td>
                  <td className="py-3 pr-4">{c.count}</td>
                  <td className="py-3">HK${c.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
