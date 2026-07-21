'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MONETIZATION_MODE_LABELS,
  PAYOUT_MODEL_LABELS,
  type PlatformMonetizationSettings,
} from '@/lib/finance/monetization-types';

type Props = {
  settings: PlatformMonetizationSettings;
  /** 進入頁面時是否剛把 DB 同步為鎖定值 */
  justSynced?: boolean;
};

export function AdminMonetizationForm({ settings, justSynced }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(
    justSynced ? '已將資料庫設定同步為訂閱為主 + 商家直付' : ''
  );
  const [error, setError] = useState('');

  const sync = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/monetization', { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失敗');
      setMessage(
        data.updated
          ? '已將資料庫設定同步為訂閱為主 + 商家直付'
          : '資料庫已是鎖定設定，無需變更'
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">產品已鎖定：訂閱為主</p>
            <p className="mt-1 opacity-90">
              不再提供「訂閱＋按單抽成」或「平台代為結算」選項。平台收入以商家訂閱月費為主。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500">收費模式</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
            {MONETIZATION_MODE_LABELS[settings.mode]}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            不收訂單 GMV 平台費、不強制預付餘額
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500">結算方式</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
            {PAYOUT_MODEL_LABELS[settings.payoutModel]}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            分享員／配送員工資由商家 FPS 直付；平台只記帳
          </p>
        </div>
      </div>

      <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
        <li>買家貨款直付商家；平台不代管買家資金。</li>
        <li>
          訂閱方案與月費請至{' '}
          <Link href="/admin/revenue" className="font-medium text-orange-600 hover:underline">
            訂閱收入
          </Link>{' '}
          管理。
        </li>
        <li>
          商家未付跟進請至{' '}
          <Link
            href="/admin/finance/payout-overdue"
            className="font-medium text-orange-600 hover:underline"
          >
            逾期未付
          </Link>
          。
        </li>
      </ul>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="button" variant="outline" onClick={() => void sync()} disabled={syncing}>
        {syncing ? '同步中…' : '同步資料庫鎖定設定'}
      </Button>
    </div>
  );
}
