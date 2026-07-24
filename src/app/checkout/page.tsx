import { SiteNavbar, prefetchSiteNavbarAuth } from '@/components/marketing/site-navbar';
import { Footer } from '@/components/marketing/footer';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getAuthUser } from '@/lib/auth/server';
import { listBuyerAddresses } from '@/lib/buyer/addresses';
import type { BuyerAddress } from '@/lib/buyer/addresses';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const user = await getAuthUser();
  const [addresses] = await Promise.all([
    user
      ? listBuyerAddresses(user.id).catch((): BuyerAddress[] => [])
      : Promise.resolve([] as BuyerAddress[]),
    prefetchSiteNavbarAuth(),
  ]);

  return (
    <div className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-950">
      <SiteNavbar />
      <CheckoutForm
        initialLoggedIn={Boolean(user)}
        initialAddresses={addresses}
      />
      <Footer />
    </div>
  );
}
