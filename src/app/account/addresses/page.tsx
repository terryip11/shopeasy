import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { BuyerAddressesManager } from '@/components/buyer/buyer-addresses-manager';
import { getAuthUser } from '@/lib/auth/server';
import { getDeliveryZones } from '@/lib/courier/server';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountAddressesPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login?redirect=/account/addresses');
  }

  const zones = await getDeliveryZones();

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          <ChevronLeft className="h-4 w-4" />
          返回我的訂單
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">收貨地址</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理常用收貨地址，結帳時可快速選擇
        </p>
        <div className="mt-8">
          <BuyerAddressesManager zones={zones} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
