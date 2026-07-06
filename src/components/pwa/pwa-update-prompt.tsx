'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useSerwist } from '@serwist/next/react';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const { serwist } = useSerwist();
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!serwist) return;

    const onWaiting = () => setVisible(true);
    serwist.addEventListener('waiting', onWaiting);
    return () => serwist.removeEventListener('waiting', onWaiting);
  }, [serwist]);

  const handleUpdate = () => {
    if (!serwist) return;
    setUpdating(true);
    serwist.messageSkipWaiting();
    const reload = () => window.location.reload();
    serwist.addEventListener('controlling', reload);
    window.setTimeout(reload, 2000);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:border-orange-800 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
          <RefreshCw className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">有新版本可用</p>
          <p className="mt-0.5 text-sm text-gray-500">更新後可取得最新功能與修復</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleUpdate} disabled={updating}>
              {updating ? '更新中...' : '立即更新'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
              稍後
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="關閉"
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
