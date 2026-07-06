'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PaymentMethodPicker,
  type CheckoutPaymentOption,
} from '@/components/checkout/payment-method-picker';
import { CreditCard, Wallet } from 'lucide-react';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import { resolveOrderPaymentMethod } from '@/lib/orders/resume-payment-client';

export function BuyerOrderPaySection({
  orderId,
  total,
  initialPaymentMethod,
}: {
  orderId: string;
  total: number;
  initialPaymentMethod?: string | null;
}) {
  const [options, setOptions] = useState<CheckoutPaymentOption[]>([]);
  const [selected, setSelected] = useState<MerchantPaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders/${orderId}/payment-options`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '無法載入付款方式');
        const methods = (data.methods || []) as CheckoutPaymentOption[];
        setOptions(methods);

        const stored = resolveOrderPaymentMethod({
          payment_method: data.currentPaymentMethod ?? initialPaymentMethod,
        });
        const storedOption = methods.find((m) => m.id === stored && m.available);
        const firstAvailable = methods.find((m) => m.available);
        setSelected(storedOption?.id ?? firstAvailable?.id ?? 'card');
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setOptionsLoading(false));
  }, [orderId, initialPaymentMethod]);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '無法開啟付款');

      if (data.type === 'manual' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('付款連結無效');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const isCard = selected === 'card';
  const selectedAvailable = options.find((o) => o.id === selected)?.available ?? false;

  const availableCount = options.filter((o) => o.available).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">此訂單尚待付款</p>
        <p className="mt-1 text-xs text-orange-800/80 dark:text-orange-300/80">
          應付總額 HK${Number(total).toFixed(2)} · 請選擇付款方式後繼續
        </p>
        {!optionsLoading && availableCount <= 1 && options.length > 1 && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            目前僅信用卡可付款。微信、支付寶等需商家在店鋪設置開放並上傳收款碼。
          </p>
        )}
      </div>

      {optionsLoading ? (
        <p className="text-sm text-gray-500">載入付款方式...</p>
      ) : options.length > 0 ? (
        <PaymentMethodPicker
          options={options}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
        />
      ) : (
        <p className="text-sm text-red-500">無法載入付款方式</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30">
          {error}
        </div>
      )}

      <Button
        className="w-full gap-2 bg-orange-500 hover:bg-orange-600 sm:w-auto"
        onClick={handlePay}
        disabled={loading || optionsLoading || !selectedAvailable}
      >
        {isCard ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
        {loading
          ? '開啟付款...'
          : isCard
            ? '使用信用卡付款'
            : '確認並查看收款資訊'}
      </Button>
    </div>
  );
}
