'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MerchantCreditRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  platform_credit_balance: number;
};

type PendingTopup = {
  id: string;
  merchant_id: string;
  amount: number;
  merchant_note: string | null;
  created_at: string;
  merchants: { id: string; name: string; slug: string; platform_credit_balance: number } | null;
};

type Props = {
  merchants: MerchantCreditRow[];
  pendingTopups: PendingTopup[];
  canEdit: boolean;
};

export function AdminPlatformCreditPanel({ merchants, pendingTopups, canEdit }: Props) {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || '');
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(pendingTopups);

  const post = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/admin/platform-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || '操作失敗');
      return false;
    }
    router.refresh();
    return true;
  };

  const directTopup = async () => {
    const value = Number(amount);
    if (!merchantId || !Number.isFinite(value) || value === 0) {
      setMessage('請選擇商家並輸入金額');
      return;
    }
    const ok = await post({
      action: value > 0 ? 'topup' : 'adjust',
      merchant_id: merchantId,
      amount: value,
      note: note.trim() || undefined,
    });
    if (ok) setMessage('已更新商家餘額');
  };

  const review = async (requestId: string, approve: boolean) => {
    const ok = await post({
      action: 'review_topup',
      request_id: requestId,
      approve,
    });
    if (ok) {
      setPending((prev) => prev.filter((p) => p.id !== requestId));
      setMessage(approve ? '已核准入帳' : '已拒絕申請');
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-900 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">待審核儲值申請</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">目前沒有待審核申請</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="text-sm">
                  <p className="font-medium">{p.merchants?.name || p.merchant_id.slice(0, 8)}</p>
                  <p className="text-gray-500">
                    申請 HK${Number(p.amount).toFixed(2)}
                    {p.merchant_note ? ` · ${p.merchant_note}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleString('zh-HK')} · 現餘額 HK$
                    {Number(p.merchants?.platform_credit_balance ?? 0).toFixed(2)}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={loading} onClick={() => review(p.id, true)}>
                      核准入帳
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => review(p.id, false)}
                    >
                      拒絕
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit && (
        <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-900 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">直接調帳／儲值</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label>商家</Label>
              <select
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}（HK${Number(m.platform_credit_balance).toFixed(0)}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>金額（正數入帳／負數調減）</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>備註</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button type="button" onClick={directTopup} disabled={loading || !merchantId}>
            {loading ? '處理中…' : '確認調帳'}
          </Button>
        </section>
      )}

      {message && <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>}

      <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">商家餘額一覽</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 pr-3">商家</th>
                <th className="pb-2 pr-3">方案</th>
                <th className="pb-2">預付餘額</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3">{m.name}</td>
                  <td className="py-2 pr-3">{m.tier}</td>
                  <td className="py-2 font-medium">
                    HK${Number(m.platform_credit_balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
