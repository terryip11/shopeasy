'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import type { UserRole } from '@/lib/auth/permissions';
import { AuthDivider, GoogleAuthButton } from '@/components/auth/google-auth-button';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const verified = searchParams.get('verified') === '1';
  const verifyError = searchParams.get('error');
  const switching = searchParams.get('switch') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('invalid login')) {
        setError('登入失敗：請確認信箱是否已完成驗證，或檢查帳號密碼是否正確');
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError('登入失敗：請確認信箱是否已完成驗證');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.session.user.id)
      .maybeSingle();

    const destination = resolvePostLoginPath(
      profile ? (profile as { role: UserRole }).role : null,
      redirect
    );
    window.location.assign(destination);
  };

  const footer = (
    <p className="text-sm text-gray-500">
      還沒有帳號？{' '}
      <Link href="/signup" className="font-medium text-orange-500 hover:text-orange-600 hover:underline">
        免費註冊
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      variant="login"
      title="歡迎回來"
      subtitle="使用電子郵件或 Google 登入"
      footer={footer}
    >
      {switching && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          已登出目前帳號，請使用其他帳號登入。
        </p>
      )}
      {verified && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          電子郵件驗證成功，請登入您的帳號。
        </p>
      )}
      {verifyError === 'verify_failed' && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          驗證連結無效或已過期，請重新註冊或重新發送驗證郵件。
        </p>
      )}
      {verifyError === 'oauth_failed' && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Google 登入失敗，請確認 Supabase 已啟用 Google 提供者並設定 Redirect URL。
        </p>
      )}

      <GoogleAuthButton label="使用 Google 登入" redirectTo={redirect} />

      <AuthDivider />

      <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">電子郵件</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">密碼</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 pl-10"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full gap-2 bg-orange-500 font-semibold hover:bg-orange-600"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-orange-500 hover:text-orange-600 hover:underline">
          忘記密碼？
        </Link>
      </p>
    </AuthPageShell>
  );
}
