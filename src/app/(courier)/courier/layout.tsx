import Link from 'next/link';
import { Navbar } from '@/components/marketing/navbar';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-2.5">
          <Link
            href="/courier"
            className="text-sm font-medium text-gray-900 hover:text-orange-600 dark:text-white"
          >
            配送員中心
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
      <main className="mx-auto w-full flex-1">{children}</main>
    </div>
  );
}
