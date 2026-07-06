import { Suspense } from 'react';
import CheckoutPayPage from './pay-content';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">載入中...</div>}>
      <CheckoutPayPage />
    </Suspense>
  );
}
