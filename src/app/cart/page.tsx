import { SiteNavbar, prefetchSiteNavbarAuth } from '@/components/marketing/site-navbar';
import { Footer } from '@/components/marketing/footer';
import { ProductsBottomNav } from '@/components/marketing/products-home/products-bottom-nav';
import { CartPanel } from '@/components/cart/cart-panel';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  await prefetchSiteNavbarAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 pb-24 md:pb-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">購物車</h1>
        <CartPanel />
      </main>
      <ProductsBottomNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
