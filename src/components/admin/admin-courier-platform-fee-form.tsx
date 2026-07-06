'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  initialRatePercent: number;
};

export function AdminCourierPlatformFeeForm({ initialRatePercent }: Props) {
  const router = useRouter();
  const [percent, setPercent] = useState(String(initialRatePercent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('請輸入 0–100 之間的百分比');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/admin/courier-platform-fee', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: value / 100 }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || '儲存失敗');
      return;
    }
    setMessage(`已更新為 ${data.ratePercent}%`);
    router.refresh();
  };

  const previewPlatformFee = (gross: number) => {
    const p = Number(percent);
    if (!Number.isFinite(p)) return 0;
    return Math.round(gross * (p / 100));
  };

  const previewNet = (gross: number) => {
    const p = Number(percent);
    if (!Number.isFinite(p)) return gross;
    return Math.round(gross * (1 - p / 100));
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="max-w-xs">
        <Label htmlFor="platform-fee-percent">平台抽成比例（%）</Label>
        <p className="mt-1 text-xs text-gray-500">
          從配送員每單<strong>總配送費</strong>（基本工資＋高評加價）中抽取，計入平台收入；配送員實收為扣除後金額。
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Input
            id="platform-fee-percent"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
        <p className="font-medium text-gray-900 dark:text-white">試算範例</p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          總配送費 HK$35 → 平台 HK${previewPlatformFee(35)} → 配送員實收 HK${previewNet(35)}
        </p>
        <p className="mt-1 text-xs text-gray-500">新比例僅影響之後接單／送達的訂單，已記帳訂單不變。</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? '儲存中...' : '儲存比例'}
      </Button>
    </form>
  );
}
