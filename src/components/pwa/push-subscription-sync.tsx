'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isPushSupported, syncPushSubscriptionIfGranted } from '@/lib/push/client';

const isDev = process.env.NODE_ENV === 'development';

/** 已登入且已授權時，將現有推播訂閱同步至伺服器 */
export function PushSubscriptionSync() {
  useEffect(() => {
    if (isDev || !isPushSupported()) return;

    const supabase = createClient();
    let cancelled = false;

    async function sync() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      await syncPushSubscriptionIfGranted();
    }

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void syncPushSubscriptionIfGranted();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
