'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { Button } from '@/components/ui/button';
import { PAYMENT_METHOD_META, type MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import { saveCart } from '@/lib/cart';
import { Copy, CheckCircle2 } from 'lucide-react';

type PaymentGroup = {
  orderId: string;
  merchantName: string;
  total: number;
  status: string;
  lines: string[];
  qrUrl: string | null;
};

export default function CheckoutPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordersParam = searchParams.get('orders') ?? '';
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [claimError, setClaimError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MerchantPaymentMethod | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [groups, setGroups] = useState<PaymentGroup[]>([]);

  useEffect(() => {
    if (!ordersParam) {
      setError('缺少訂單資訊');
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/payment-info?orders=${encodeURIComponent(ordersParam)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '載入失敗');
        setPaymentMethod(data.paymentMethod);
        setGrandTotal(data.grandTotal);
        setGroups(data.groups);
        saveCart([]);
        window.dispatchEvent(new Event('shopeasy-cart-updated'));
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ordersParam]);

  const methodLabel = paymentMethod ? PAYMENT_METHOD_META[paymentMethod].label : '';

  const orderIds = ordersParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleClaimPayment = async () => {
    if (orderIds.length === 0) return;
    setClaiming(true);
    setClaimError('');

    try {
      const res = await fetch('/api/orders/claim-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '回報失敗');
      router.push('/orders');
    } catch (err) {
      setClaimError((err as Error).message);
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-500">載入付款資訊...</p>
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
            <p className="text-red-500">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/orders">查看我的訂單</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-orange-500" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">訂單已建立</h1>
              <p className="mt-2 text-sm text-gray-500">
                請使用 <span className="font-medium text-gray-800 dark:text-gray-200">{methodLabel}</span>{' '}
                完成付款
              </p>
              <p className="mt-3 text-2xl font-bold text-orange-500">HK${grandTotal.toFixed(2)}</p>
            </div>

            {groups.map((group) => (
              <div
                key={group.orderId}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{group.merchantName}</h2>
                  <span className="text-sm font-bold text-orange-500">HK${group.total.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">訂單 #{group.orderId.slice(0, 8)}</p>

                {group.qrUrl && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <Image
                        src={group.qrUrl}
                        alt={`${group.merchantName} 收款碼`}
                        fill
                        className="object-contain p-2"
                        sizes="192px"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">長按或截圖後掃碼付款</p>
                  </div>
                )}

                {group.lines.length > 0 && (
                  <ul className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
                    {group.lines.map((line) => (
                      <li
                        key={line}
                        className="flex items-start justify-between gap-2 text-gray-700 dark:text-gray-300"
                      >
                        <span>{line}</span>
                        <button
                          type="button"
                          className="shrink-0 text-orange-600 hover:text-orange-700"
                          onClick={() => void navigator.clipboard.writeText(line.split('：')[1] ?? line)}
                          aria-label="複製"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              完成轉帳後請按下方按鈕回報；商家核對款項後會將訂單改為「已付款」。請保留付款截圖以便核對。
            </div>

            {claimError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30">
                {claimError}
              </p>
            )}

            <Button
              className="h-12 w-full"
              disabled={claiming}
              onClick={() => void handleClaimPayment()}
            >
              {claiming ? '提交中...' : '我已完成付款'}
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/orders">稍後再回報，查看訂單</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
