import Link from 'next/link';
import { Navbar } from '@/components/marketing/navbar';

export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-lg px-4 py-2.5 md:max-w-3xl">
          <Link
            href="/promoter"
            className="text-sm font-medium text-gray-900 hover:text-orange-600 dark:text-white"
          >
            分享員中心
          </Link>
        </div>
      </div>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:max-w-3xl">{children}</main>
    </div>
  );
}
