'use client';

import {
  CreditCard,
  DollarSign,
  ScanLine,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import {
  PAYMENT_METHOD_META,
  type MerchantPaymentMethod,
} from '@/lib/merchant/payment-methods';

export type CheckoutPaymentOption = {
  id: MerchantPaymentMethod;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
};

const ICONS: Partial<Record<MerchantPaymentMethod, typeof CreditCard>> = {
  card: CreditCard,
  bank_transfer: DollarSign,
  fps: ScanLine,
};

const ICON_BG: Record<MerchantPaymentMethod, string> = {
  card: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
  bank_transfer: 'bg-green-100 text-green-600 dark:bg-green-900/30',
  fps: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
  wechat_pay: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  alipay: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30',
};

function MethodIcon({ method }: { method: MerchantPaymentMethod }) {
  if (method === 'wechat_pay') return <span className="text-sm font-bold">微</span>;
  if (method === 'alipay') return <span className="text-sm font-bold">支</span>;
  const Icon = ICONS[method]!;
  return <Icon className="h-5 w-5" />;
}

type Props = {
  options: CheckoutPaymentOption[];
  selected: MerchantPaymentMethod;
  onSelect: (method: MerchantPaymentMethod) => void;
  loading?: boolean;
};

export function PaymentMethodPicker({ options, selected, onSelect, loading }: Props) {
  if (options.length === 0) return null;

  const hasUnavailable = options.some((o) => !o.available);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
      <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">付款方式</h2>
        <p className="mt-1 text-xs text-gray-500">選擇您要使用的付款方式</p>
      </div>
      <div className="space-y-2 p-4">
        {options.map((opt) => {
          const isOn = selected === opt.id;
          const meta = PAYMENT_METHOD_META[opt.id];
          const disabled = loading || !opt.available;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => opt.available && onSelect(opt.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                !opt.available
                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-900/50'
                  : isOn
                    ? 'border-orange-400 bg-orange-50/50 dark:border-orange-600 dark:bg-orange-950/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_BG[opt.id]}`}
              >
                <MethodIcon method={opt.id} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-gray-500">{meta.description}</p>
                {!opt.available && opt.unavailableReason && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {opt.unavailableReason}
                  </p>
                )}
              </div>
              {opt.available ? (
                isOn ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-orange-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                )
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
              )}
            </button>
          );
        })}
      </div>
      {hasUnavailable && (
        <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-800">
          不可選的方式：商家未開放、或已開放但收款資料尚未設定完整。請選擇可用的方式，或聯絡商家。
        </p>
      )}
    </section>
  );
}
