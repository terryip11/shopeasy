'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlatformPayoutSettings } from '@/lib/finance/platform-payout-types';

/** Client-safe shape mirrored from server credit helpers */
export type CreditLedgerEntry = {
  id: string;
  merchant_id: string;
  entry_type: 'topup' | 'deduct_order' | 'refund_order' | 'adjust';
  amount: number;
  balance_after: number;
  order_id: string | null;
  topup_request_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreditTopupRequest = {
  id: string;
  merchant_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  merchant_note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Props = {
  balance: number;
  feeRate: number;
  tier: string;
  platformPayout: PlatformPayoutSettings;
  initialLedger: CreditLedgerEntry[];
  initialTopups: CreditTopupRequest[];
};

const ENTRY_LABEL: Record<string, string> = {
  topup: '儲值',
  deduct_order: '訂單扣費',
  refund_order: '退款退回',
  adjust: '調帳',
};

export function MerchantPlatformCreditPanel({
  balance,
  feeRate,
  tier,
  platformPayout,
  initialLedger,
  initialTopups,
}: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [topups, setTopups] = useState(initialTopups);
  const [ledger] = useState(initialLedger);

  const submitTopup = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 10) {
      setMessage({ type: 'err', text: '請輸入至少 HK$10 的儲值金額' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/merchant/platform-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: value, merchant_note: note.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: 'err', text: data.error || '提交失敗' });
      setLoading(false);
      return;
    }
    setTopups((prev) => [data.request as CreditTopupRequest, ...prev]);
    setMessage({
      type: 'ok',
      text: '已提交儲值申請。請先轉帳至平台 FPS，管理員核對後會入帳。',
    });
    setNote('');
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-5 dark:border-orange-900 dark:bg-orange-950/30">
        <p className="text-sm text-orange-800/80 dark:text-orange-200/80">目前預付餘額</p>
        <p className="mt-1 text-3xl font-bold text-orange-900 dark:text-orange-100">
          HK${balance.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-orange-800/90 dark:text-orange-200/90">
          方案 {tier} · 線下訂單平台服務費約 {(feeRate * 100).toFixed(1)}%（確認收款時自餘額扣除）。
          信用卡訂單不扣預付餘額。
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">平台儲值轉帳資料</h2>
        {platformPayout.fpsId ? (
          <>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">收款人</dt>
                <dd className="font-medium">{platformPayout.accountHolder || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">FPS</dt>
                <dd className="font-mono font-medium">{platformPayout.fpsId}</dd>
              </div>
            </dl>
            {platformPayout.instructions && (
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {platformPayout.instructions}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-amber-700">平台尚未設定 FPS，請聯絡管理員後再儲值。</p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">申請儲值</h2>
        <p className="text-sm text-gray-500">
          請先轉帳至上方 FPS，再提交金額。管理員核對到帳後餘額才會增加。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="topup-amount">金額（HKD）*</Label>
            <Input
              id="topup-amount"
              type="number"
              min={10}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="topup-note">備註（可填轉帳參考）</Label>
            <Input
              id="topup-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              placeholder="例如轉帳時間／戶名"
            />
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
        <Button type="button" onClick={submitTopup} disabled={loading || !platformPayout.fpsId}>
          {loading ? '提交中…' : '我已轉帳，提交儲值申請'}
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">儲值申請</h2>
        {topups.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">尚無申請紀錄</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
            {topups.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  HK${Number(t.amount).toFixed(2)}
                  {t.merchant_note ? ` · ${t.merchant_note}` : ''}
                </span>
                <span
                  className={
                    t.status === 'approved'
                      ? 'text-green-600'
                      : t.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-amber-600'
                  }
                >
                  {t.status === 'approved' ? '已入帳' : t.status === 'rejected' ? '已拒絕' : '待審核'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">餘額流水</h2>
        {ledger.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">尚無流水</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
            {ledger.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">{ENTRY_LABEL[e.entry_type] || e.entry_type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.created_at).toLocaleString('zh-HK')}
                    {e.note ? ` · ${e.note}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={Number(e.amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Number(e.amount) >= 0 ? '+' : ''}
                    {Number(e.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">餘額 {Number(e.balance_after).toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
