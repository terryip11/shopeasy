'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  orderId: string;
};

const SCORES = [1, 2, 3, 4, 5] as const;

export function BuyerCourierRatingForm({ orderId }: Props) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (score == null) return;
    setLoading(true);
    setError('');

    const res = await fetch(`/api/orders/${orderId}/rate-courier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '評分失敗');
      return;
    }
    setDone(true);
    router.refresh();
  };

  if (done) {
    return (
      <p className="mt-4 text-sm text-green-600">感謝您的評分！</p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/80 p-4 dark:border-orange-800 dark:bg-orange-950/30">
      <p className="text-sm font-medium text-gray-900 dark:text-white">為配送員評分（1–5 星）</p>
      <p className="mt-0.5 text-xs text-gray-500">送達後請為本次配送體驗評分</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SCORES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScore(s)}
            className={`min-h-9 min-w-9 rounded-lg border text-sm font-medium transition-colors ${
              score === s
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <Button
        size="sm"
        className="mt-3"
        disabled={score == null || loading}
        onClick={() => void submit()}
      >
        {loading ? '提交中...' : '提交評分'}
      </Button>
    </div>
  );
}
