'use client';

import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { useOrderRowStatus } from '@/components/merchant/order-row-context';

export function MerchantOrderStatusBadge({
  buyerPaymentClaimedAt,
}: {
  buyerPaymentClaimedAt?: string | null;
}) {
  const { status } = useOrderRowStatus();
  return (
    <OrderStatusBadge status={status} buyerPaymentClaimedAt={buyerPaymentClaimedAt} />
  );
}
