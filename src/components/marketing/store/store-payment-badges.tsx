import { CreditCard, Wallet } from 'lucide-react';
import {
  normalizePaymentMethods,
  PAYMENT_METHOD_META,
  type MerchantPaymentMethod,
} from '@/lib/merchant/payment-methods';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';

type Props = {
  paymentMethods: string[] | null;
  variant?: 'hero' | 'light';
};

function displayMethods(methods: string[] | null): MerchantPaymentMethod[] {
  let normalized = normalizePaymentMethods(methods);
  if (!isStripePaymentsEnabled()) {
    normalized = normalized.filter((m) => m !== 'card');
  }
  return normalized;
}

export function StorePaymentBadges({ paymentMethods, variant = 'hero' }: Props) {
  const methods = displayMethods(paymentMethods);

  if (methods.length === 0) return null;

  const isLight = variant === 'light';
  const labelClass = isLight ? 'text-gray-500 dark:text-gray-400' : 'text-white/75';
  const badgeClass = isLight
    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
    : 'bg-white/20 text-white backdrop-blur-sm';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`flex items-center gap-1 text-xs ${labelClass}`}>
        <Wallet className="h-3.5 w-3.5" />
        支援付款：
      </span>
      {methods.map((method) => (
        <span
          key={method}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}
        >
          {method === 'card' && <CreditCard className="h-3 w-3" />}
          {PAYMENT_METHOD_META[method].label}
        </span>
      ))}
    </div>
  );
}
