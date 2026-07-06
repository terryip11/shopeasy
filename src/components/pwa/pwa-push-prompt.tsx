'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isIosDevice, isPushSupported, isStandalonePwa, subscribeToWebPush } from '@/lib/push/client';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'shopeasy_push_prompt_dismissed';
const isDev = process.env.NODE_ENV === 'development';

export function PwaPushPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDev || !isPushSupported()) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (isIosDevice() && !isStandalonePwa()) return;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setVisible(true);
    });
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    const result = await subscribeToWebPush();
    setLoading(false);
    if (result.ok) {
      dismiss();
      return;
    }
    setError(result.error);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="開啟推播通知"
      className="fixed bottom-4 left-4 right-4 z-[58] mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40">
          <Bell className="h-5 w-5 text-sky-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">開啟訂單推播通知</p>
          <p className="mt-0.5 text-sm text-gray-500">
            付款、發貨、配送狀態更新時即時通知您
          </p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleEnable} disabled={loading}>
              {loading ? '設定中...' : '開啟通知'}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              稍後
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="關閉"
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
