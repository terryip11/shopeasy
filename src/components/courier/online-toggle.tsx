'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface OnlineToggleProps {
  isOnline: boolean;
}

export function OnlineToggle({ isOnline: initial }: OnlineToggleProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const res = await fetch('/api/courier/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: !isOnline }),
    });
    if (res.ok) {
      setIsOnline(!isOnline);
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '切換失敗');
    }
    setLoading(false);
  };

  return (
    <Button
      type="button"
      variant={isOnline ? 'default' : 'outline'}
      onClick={toggle}
      disabled={loading}
      className={`min-h-11 shrink-0 px-4 ${isOnline ? 'bg-green-600 hover:bg-green-700' : ''}`}
    >
      {loading ? '更新中...' : isOnline ? '上線中' : '離線 — 點擊上線'}
    </Button>
  );
}
