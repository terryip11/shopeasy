'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  earningType: 'promoter' | 'courier';
  earningId: string;
  disabled?: boolean;
  className?: string;
};

export function ReportUnpaidButton({
  earningType,
  earningId,
  disabled,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onClick = async () => {
    if (
      !confirm(
        '確認向平台回報商家尚未付款？平台會記錄並跟進，但不會代為墊付。'
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payout/report-unpaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earningType, earningId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '回報失敗');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <span className="text-xs text-emerald-600">已回報未付</span>;
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || loading}
        onClick={() => void onClick()}
      >
        {loading ? '送出中…' : '回報未付'}
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
