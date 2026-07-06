import { Suspense } from 'react';
import { QrLoginForm } from '@/components/auth/qr-login-form';

export default function QrLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">載入中...</div>
      }
    >
      <QrLoginForm />
    </Suspense>
  );
}
