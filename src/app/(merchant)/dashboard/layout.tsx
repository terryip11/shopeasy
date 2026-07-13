/**
 * 商家中心 Dashboard 佈局
 */

import { getActiveMerchantForUser } from '@/lib/auth/server';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { getMerchantOrderAttention } from '@/lib/merchant/server';
import { Sidebar } from '@/components/merchant/sidebar';
import { MerchantMobileHeader } from '@/components/merchant/merchant-mobile-header';
import { MerchantMobileDrawer } from '@/components/merchant/merchant-mobile-drawer';
import { MerchantMobileNavProvider } from '@/components/merchant/merchant-mobile-nav-context';
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
        storeSlug: merchant.slug,
      }
    : null;

  const attention = merchant ? await getMerchantOrderAttention() : null;

  return (
    <MerchantBrandingProvider initial={initialBranding}>
      <OrderNotificationProvider
        merchantId={merchant?.id ?? null}
        initialAttentionCount={attention?.attention ?? 0}
      >
        <MerchantMobileNavProvider>
          <MerchantMobileDrawer />
          <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar />
            <div className="flex min-h-screen flex-col lg:ml-64">
              <MerchantMobileHeader />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
          </div>
        </MerchantMobileNavProvider>
      </OrderNotificationProvider>
    </MerchantBrandingProvider>
  );
}
