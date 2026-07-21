'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  initialHolder: string;
  initialFpsId: string;
};

export function CourierPayoutForm({ initialHolder, initialFpsId }: Props) {
  const router = useRouter();
  const [holder, setHolder] = useState(initialHolder);
  const [fpsId, setFpsId] = useState(initialFpsId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/courier/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_account_holder: holder.trim(),
          payout_fps_id: fpsId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setMessage('已更新收款資料');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">工資收款（FPS）</h2>
      <p className="mt-1 text-xs text-gray-500">商家直付配送工資時會使用此資料。</p>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="courier-fps-holder">收款人姓名</Label>
          <Input
            id="courier-fps-holder"
            className="mt-1"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="與銀行／FPS 登記姓名一致"
          />
        </div>
        <div>
          <Label htmlFor="courier-fps-id">轉數快識別碼</Label>
          <Input
            id="courier-fps-id"
            className="mt-1"
            value={fpsId}
            onChange={(e) => setFpsId(e.target.value)}
            placeholder="手機號碼、電郵或 FPS ID"
          />
        </div>
        {message && <p className="text-xs text-green-600">{message}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button type="button" className="w-full" disabled={saving} onClick={() => void save()}>
          {saving ? '儲存中...' : '儲存收款資料'}
        </Button>
      </div>
    </section>
  );
}
