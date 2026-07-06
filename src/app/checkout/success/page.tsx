import { Suspense } from 'react';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { SuccessContent } from './success-content';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <Suspense fallback={<div className="py-16 text-center">載入中...</div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}
