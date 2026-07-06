'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MERCHANT_STATS_FALLBACK_POLL_MS } from '@/lib/delivery/tracking-config';
import { attentionDelta, countsTowardAttention } from '@/lib/merchant/order-attention';
import { Bell, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OrderAlert = {
  id: string;
  dedupKey: string;
  orderId: string;
  title: string;
  message: string;
  href: string;
};

type OrderNotificationContextValue = {
  attentionCount: number;
  refreshStats: () => Promise<void>;
  adjustAttentionCount: (delta: number) => void;
};

const OrderNotificationContext = createContext<OrderNotificationContextValue>({
  attentionCount: 0,
  refreshStats: async () => {},
  adjustAttentionCount: () => {},
});

export function useOrderNotifications() {
  return useContext(OrderNotificationContext);
}

function playNotificationTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: 'shopeasy-order' });
  } catch {
    // ignore
  }
}

type Props = {
  children: ReactNode;
  merchantId?: string | null;
  initialAttentionCount?: number;
};

export function OrderNotificationProvider({
  children,
  merchantId: merchantIdProp = null,
  initialAttentionCount = 0,
}: Props) {
  const [attentionCount, setAttentionCount] = useState(initialAttentionCount);
  const [alerts, setAlerts] = useState<OrderAlert[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  const refreshStats = useCallback(async () => {
    const res = await fetch('/api/merchant/orders/stats');
    if (!res.ok) return;
    const data = await res.json();
    setAttentionCount(data.attention ?? 0);
  }, []);

  const adjustAttentionCount = useCallback((delta: number) => {
    if (delta === 0) return;
    setAttentionCount((c) => Math.max(0, c + delta));
  }, []);

  const pushAlert = useCallback((alert: Omit<OrderAlert, 'id'> & { id?: string }) => {
    const dedupKey = alert.dedupKey;
    if (seenRef.current.has(dedupKey)) return;
    seenRef.current.add(dedupKey);

    const full: OrderAlert = {
      ...alert,
      id: alert.id ?? `${dedupKey}-${Date.now()}`,
    };

    setAlerts((prev) => [full, ...prev].slice(0, 5));
    playNotificationTone();
    showBrowserNotification(alert.title, alert.message);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!merchantIdProp) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`merchant-orders-${merchantIdProp}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantIdProp}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; total?: number };
          if (countsTowardAttention(row.status)) {
            adjustAttentionCount(1);
          }
          pushAlert({
            dedupKey: `insert-${row.id}`,
            orderId: row.id,
            title: '新訂單',
            message: `訂單 #${row.id.slice(0, 8)} 已建立（待付款）· HK$${Number(row.total || 0).toFixed(2)}`,
            href: '/dashboard/orders',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantIdProp}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; total?: number };
          const old = payload.old as { status?: string };
          const delta = attentionDelta(old.status, row.status);
          if (delta !== 0) adjustAttentionCount(delta);

          if (row.status === 'paid' && old.status !== 'paid') {
            pushAlert({
              dedupKey: `paid-${row.id}`,
              orderId: row.id,
              title: '訂單已付款',
              message: `訂單 #${row.id.slice(0, 8)} 已付款，請安排發貨 · HK$${Number(row.total || 0).toFixed(2)}`,
              href: '/dashboard/orders',
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refreshStats();
        }
      });

    const poll = setInterval(() => void refreshStats(), MERCHANT_STATS_FALLBACK_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshStats();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [merchantIdProp, pushAlert, refreshStats, adjustAttentionCount]);

  return (
    <OrderNotificationContext.Provider
      value={{ attentionCount, refreshStats, adjustAttentionCount }}
    >
      {children}

      <div className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="pointer-events-auto rounded-2xl border border-orange-200 bg-white p-4 shadow-lg dark:border-orange-800 dark:bg-gray-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{alert.title}</p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                <Link
                  href={alert.href}
                  className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline"
                  onClick={() => dismissAlert(alert.id)}
                >
                  查看訂單 →
                </Link>
              </div>
              <button
                type="button"
                onClick={() => dismissAlert(alert.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {attentionCount > 0 && alerts.length === 0 && merchantIdProp && (
        <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
          <Button asChild className="gap-2 shadow-lg">
            <Link href="/dashboard/orders">
              <ShoppingBag className="h-4 w-4" />
              {attentionCount} 筆訂單待處理
            </Link>
          </Button>
        </div>
      )}
    </OrderNotificationContext.Provider>
  );
}
