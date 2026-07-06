'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function FinanceBackfillButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const run = async () => {
    if (!confirm('為所有已付款但尚未記帳的訂單補建財務分錄？')) return;
    setLoading(true);
    setResult('');
    const res = await fetch('/api/admin/finance/backfill', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setResult(data.error || '失敗');
    } else {
      setResult(`新增 ${data.created} 筆，略過 ${data.skipped} 筆`);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={loading}>
        {loading ? '處理中...' : '補建歷史訂單分錄'}
      </Button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}
