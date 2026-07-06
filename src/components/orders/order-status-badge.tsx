import type { OrderStatus } from '@/types/database';
import { resolveOrderStatusDisplay } from '@/lib/orders/display-status';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  buyerPaymentClaimedAt?: string | null;
}

export function OrderStatusBadge({ status, buyerPaymentClaimedAt }: OrderStatusBadgeProps) {
  const display = resolveOrderStatusDisplay({
    status,
    buyer_payment_claimed_at: buyerPaymentClaimedAt,
  });

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${display.className}`}
    >
      {display.label}
    </span>
  );
}
