'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, DollarSign, ScanLine, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MERCHANT_PAYMENT_METHODS,
  PAYMENT_METHOD_META,
  normalizePaymentMethods,
  type MerchantPaymentMethod,
} from '@/lib/merchant/payment-methods';

const ICONS: Partial<Record<MerchantPaymentMethod, typeof CreditCard>> = {
  card: CreditCard,
  bank_transfer: DollarSign,
  fps: ScanLine,
};

const ICON_BG: Record<MerchantPaymentMethod, string> = {
  card: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  bank_transfer: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  fps: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  wechat_pay: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  alipay: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
};

function PaymentMethodIcon({ method }: { method: MerchantPaymentMethod }) {
  if (method === 'wechat_pay') {
    return <span className="text-base font-bold">微</span>;
  }
  if (method === 'alipay') {
    return <span className="text-base font-bold">支</span>;
  }
  const Icon = ICONS[method]!;
  return <Icon className="h-6 w-6" />;
}

type Props = {
  initialMethods: string[];
  stripePaymentsEnabled?: boolean;
};

export function MerchantPaymentMethodsForm({
  initialMethods,
  stripePaymentsEnabled = false,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<MerchantPaymentMethod[]>(() =>
    normalizePaymentMethods(initialMethods)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const toggle = (method: MerchantPaymentMethod) => {
    if (method === 'card') return;
    setMessage('');
    setError('');
    setSelected((prev) => {
      const next = prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method];
      return normalizePaymentMethods(next);
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/merchant/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_methods: selected }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || '儲存失敗');
      setSaving(false);
      return;
    }

    setMessage('客人支付方式已更新');
    router.refresh();
    setSaving(false);
  };

  const hasExtra = selected.some((m) => m !== 'card');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MERCHANT_PAYMENT_METHODS.map((method) => {
          const meta = PAYMENT_METHOD_META[method];
          const isOn = selected.includes(method);
          const isRequired = meta.required && stripePaymentsEnabled;
          const isComingSoon = method === 'card' && !stripePaymentsEnabled;

          return (
            <button
              key={method}
              type="button"
              onClick={() => toggle(method)}
              disabled={isRequired || isComingSoon}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                isComingSoon
                  ? 'cursor-default border-gray-100 bg-gray-50 opacity-80 dark:border-gray-800 dark:bg-gray-900/50'
                  : isOn
                  ? 'border-orange-400 bg-orange-50/50 dark:border-orange-600 dark:bg-orange-950/20'
                  : 'border-dashed border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              } ${isRequired ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ICON_BG[method]}`}
              >
                <PaymentMethodIcon method={method} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{meta.label}</h4>
                  {isComingSoon && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      即將開放
                    </span>
                  )}
                  {isRequired && !isComingSoon && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      平台預設
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isComingSoon
                    ? '平台 Stripe 線上收款即將開放，目前請先設定轉帳、FPS 或微信／支付寶。'
                    : meta.description}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-orange-600">
                {isOn ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {hasExtra && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          已啟用的線下付款方式，請在下方「收款方式」填寫對應資料（銀行戶口、FPS、微信或支付寶收款碼）。
          若暫不支援某方式，請先取消勾選，否則儲存收款資料時會要求填寫。
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? '儲存中...' : '儲存客人支付方式'}
      </Button>
    </div>
  );
}
