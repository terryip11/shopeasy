/**
 * 商家中心 Dashboard 佈局
 */

import { getActiveMerchantForUser } from '@/lib/auth/server';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { getMerchantOrderAttention } from '@/lib/merchant/server';
import { Sidebar } from '@/components/merchant/sidebar';
import { OrderNotificationProvider } from '@/components/merchant/order-notification-provider';
import { MerchantBrandingProvider } from '@/components/merchant/merchant-branding-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const merchant = await getActiveMerchantForUser();
  const initialBranding = merchant
    ? {
        name: merchant.name,
        logoUrl: normalizeR2ImageUrl(merchant.logo_url),
      }
    : null;

  const attention = merchant ? await getMerchantOrderAttention() : null;

  return (
    <MerchantBrandingProvider initial={initialBranding}>
      <OrderNotificationProvider
        merchantId={merchant?.id ?? null}
        initialAttentionCount={attention?.attention ?? 0}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1 transition-all duration-300">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </OrderNotificationProvider>
    </MerchantBrandingProvider>
  );
}
