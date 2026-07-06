import Link from 'next/link';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
        <XCircle className="mx-auto h-16 w-16 text-orange-500" />
        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">付款已取消</h1>
        <p className="mt-2 text-gray-500">您的購物車內容已保留，可隨時回來完成結帳。</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/checkout">返回結帳</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/cart">查看購物車</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
