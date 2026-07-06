import { notFound } from 'next/navigation';
import { getMerchantOrderTracking } from '@/lib/merchant/delivery-tracking';
import { MerchantOrderTrackingPanel } from '@/components/merchant/merchant-order-tracking-panel';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function MerchantOrderTrackingPage({ params }: PageProps) {
  const { id } = await params;
  const tracking = await getMerchantOrderTracking(id);

  if (!tracking) notFound();

  return <MerchantOrderTrackingPanel orderId={id} initial={tracking} />;
}
