'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  MerchantPayablesSummary,
  PayableCourierItem,
  PayablePromoterItem,
} from '@/lib/merchant/payables-types';

type Props = {
  initial: MerchantPayablesSummary;
};

function formatMoney(n: number) {
  return `HK$${n.toFixed(2)}`;
}

function FpsBlock({
  accountHolder,
  fpsId,
}: {
  accountHolder: string;
  fpsId: string;
}) {
  if (!accountHolder && !fpsId) {
    return <span className="text-amber-600">對方尚未填寫 FPS</span>;
  }
  return (
    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
      {accountHolder || '—'}
      {fpsId ? ` · ${fpsId}` : ''}
    </span>
  );
}

export function MerchantPayablesPanel({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const markPaid = async (type: 'promoter' | 'courier', earningId: string) => {
    if (!confirm('確認已透過 FPS 轉帳給對方？此操作會標記為已付。')) return;
    setLoadingId(earningId);
    setError('');
    try {
      const res = await fetch('/api/merchant/payables/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, earningId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '標記失敗');
      router.refresh();
      const nextRes = await fetch('/api/merchant/payables');
      const next = await nextRes.json();
      if (nextRes.ok) {
        setData(next);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  const pendingPromoters = data.promoters.filter((p) => !p.paidAt && p.status !== 'paid');
  const paidPromoters = data.promoters.filter((p) => p.paidAt || p.status === 'paid');
  const pendingCouriers = data.couriers.filter((c) => !c.paidAt);
  const paidCouriers = data.couriers.filter((c) => c.paidAt);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="text-sm text-violet-800/80 dark:text-violet-200/80">待付分享員</p>
          <p className="mt-1 text-2xl font-bold text-violet-950 dark:text-violet-50">
            {formatMoney(data.promoterPendingTotal)}
          </p>
          <p className="mt-1 text-xs text-violet-700/80">{data.promoterPendingCount} 筆</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
          <p className="text-sm text-sky-800/80 dark:text-sky-200/80">待付配送員</p>
          <p className="mt-1 text-2xl font-bold text-sky-950 dark:text-sky-50">
            {formatMoney(data.courierPendingTotal)}
          </p>
          <p className="mt-1 text-xs text-sky-700/80">{data.courierPendingCount} 筆</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <PayableSection
        title="分享員佣金"
        empty="暫無分享佣金紀錄"
        pending={pendingPromoters}
        paid={paidPromoters}
        renderPending={(item) => (
          <PromoterRow
            key={item.id}
            item={item}
            loading={loadingId === item.id}
            onPay={() => void markPaid('promoter', item.id)}
          />
        )}
        renderPaid={(item) => <PromoterRow key={item.id} item={item} paid />}
      />

      <PayableSection
        title="配送員工資"
        empty="暫無配送工資紀錄"
        pending={pendingCouriers}
        paid={paidCouriers}
        renderPending={(item) => (
          <CourierRow
            key={item.id}
            item={item}
            loading={loadingId === item.id}
            onPay={() => void markPaid('courier', item.id)}
          />
        )}
        renderPaid={(item) => <CourierRow key={item.id} item={item} paid />}
      />
    </div>
  );
}

function PayableSection<T>({
  title,
  empty,
  pending,
  paid,
  renderPending,
  renderPaid,
}: {
  title: string;
  empty: string;
  pending: T[];
  paid: T[];
  renderPending: (item: T) => ReactNode;
  renderPaid: (item: T) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {pending.length === 0 && paid.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
          {empty}
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">待付款</p>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
                {pending.map(renderPending)}
              </ul>
            </div>
          )}
          {paid.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">已付款</p>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white opacity-80 dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
                {paid.slice(0, 20).map(renderPaid)}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PromoterRow({
  item,
  paid,
  loading,
  onPay,
}: {
  item: PayablePromoterItem;
  paid?: boolean;
  loading?: boolean;
  onPay?: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {item.promoter.displayName}
          <span className="ml-2 text-sm font-normal text-orange-600">
            {formatMoney(item.amount)}
          </span>
        </p>
        <p className="text-xs text-gray-500">
          訂單 #{item.orderShort} · 佣金 {(item.commissionRate * 100).toFixed(1)}% ·{' '}
          {new Date(item.createdAt).toLocaleString('zh-HK')}
        </p>
        <p className="text-xs">
          FPS：
          <FpsBlock
            accountHolder={item.promoter.accountHolder}
            fpsId={item.promoter.fpsId}
          />
        </p>
        {paid && item.paidAt && (
          <p className="text-xs text-green-600">
            已付於 {new Date(item.paidAt).toLocaleString('zh-HK')}
          </p>
        )}
      </div>
      {!paid && onPay && (
        <Button
          type="button"
          size="sm"
          disabled={loading || (!item.promoter.fpsId && !item.promoter.accountHolder)}
          onClick={onPay}
        >
          {loading ? '處理中...' : '標記已付'}
        </Button>
      )}
    </li>
  );
}

function CourierRow({
  item,
  paid,
  loading,
  onPay,
}: {
  item: PayableCourierItem;
  paid?: boolean;
  loading?: boolean;
  onPay?: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {item.courier.displayName}
          <span className="ml-2 text-sm font-normal text-orange-600">
            {formatMoney(item.amount)}
          </span>
        </p>
        <p className="text-xs text-gray-500">
          訂單 #{item.orderShort} · {item.jobType === 'food' ? '送餐' : '送貨'} ·{' '}
          {new Date(item.earnedAt).toLocaleString('zh-HK')}
          {item.courier.phone ? ` · ${item.courier.phone}` : ''}
        </p>
        <p className="text-xs">
          FPS：
          <FpsBlock
            accountHolder={item.courier.accountHolder}
            fpsId={item.courier.fpsId}
          />
        </p>
        {paid && item.paidAt && (
          <p className="text-xs text-green-600">
            已付於 {new Date(item.paidAt).toLocaleString('zh-HK')}
          </p>
        )}
      </div>
      {!paid && onPay && (
        <Button
          type="button"
          size="sm"
          disabled={loading || (!item.courier.fpsId && !item.courier.accountHolder)}
          onClick={onPay}
        >
          {loading ? '處理中...' : '標記已付'}
        </Button>
      )}
    </li>
  );
}
