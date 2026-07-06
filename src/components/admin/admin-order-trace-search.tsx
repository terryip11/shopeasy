'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminOrderTraceSearch({ defaultQuery }: { defaultQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultQuery ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = q.trim();
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    params.delete('page');
    router.push(`/admin/orders/trace?${params.toString()}`);
  };

  const clear = () => {
    setQ('');
    router.push('/admin/orders/trace');
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[16rem] flex-1">
        <label htmlFor="order-trace-q" className="text-xs font-medium text-gray-500">
          訂單 ID（至少 8 碼）
        </label>
        <Input
          id="order-trace-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例如 d2d2613a"
          className="mt-1 font-mono"
        />
      </div>
      <Button type="submit" size="sm">
        搜尋
      </Button>
      {defaultQuery && (
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          清除
        </Button>
      )}
    </form>
  );
}
