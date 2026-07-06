'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '發送失敗');
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-md flex-1 px-4 py-16 w-full">
        <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">忘記密碼</h1>
          <p className="mt-2 text-sm text-gray-500">我們將寄送重設密碼連結到您的信箱</p>

          {sent ? (
            <p className="mt-6 text-sm text-green-600 dark:text-green-400">
              若該信箱已註冊，您將收到重設密碼郵件，請檢查收件匣與垃圾郵件。
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">電子郵件</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '發送中...' : '發送重設連結'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/login" className="text-orange-500 hover:underline">
              返回登入
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
