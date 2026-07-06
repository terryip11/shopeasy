'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, RefreshCw, User, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthDivider, GoogleAuthButton } from '@/components/auth/google-auth-button';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getEmailRedirectTo() {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');
  return `${base}/auth/callback?next=/`;
}

function AuthField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {children}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: { display_name: displayName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError('此電子郵件已註冊，請直接登入或使用忘記密碼重設');
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.assign('/');
      return;
    }

    setStep('verify');
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    setResendLoading(true);
    setResendMessage('');

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getEmailRedirectTo() },
    });

    setResendLoading(false);

    if (resendError) {
      setResendMessage(resendError.message);
      return;
    }

    setResendMessage('驗證郵件已重新發送，請查收信箱（含垃圾郵件匣）');
    startResendCooldown();
  };

  const loginFooter = (
    <p className="text-sm text-gray-500">
      已有帳號？{' '}
      <Link href="/login" className="font-medium text-orange-500 hover:text-orange-600 hover:underline">
        立即登入
      </Link>
    </p>
  );

  if (step === 'verify') {
    return (
      <AuthPageShell
        variant="verify"
        title="請驗證電子郵件"
        subtitle="只差最後一步，驗證後即可開始購物"
        footer={loginFooter}
      >
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            我們已向{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{email}</span>{' '}
            發送驗證連結，請在 24 小時內點擊完成驗證。
          </p>
          <p className="mt-2 text-xs text-gray-500">若未收到，請檢查垃圾郵件匣。</p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
          >
            <RefreshCw className={`h-4 w-4 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendCooldown > 0
              ? `${resendCooldown} 秒後可重新發送`
              : resendLoading
                ? '發送中...'
                : '重新發送驗證郵件'}
          </Button>

          {resendMessage && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {resendMessage}
            </p>
          )}

          <Link href="/login" className="block">
            <Button type="button" className="h-11 w-full bg-orange-500 hover:bg-orange-600">
              前往登入
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      variant="signup"
      title="建立帳號"
      subtitle="使用電子郵件或 Google 快速註冊"
      footer={loginFooter}
    >
      <GoogleAuthButton label="使用 Google 註冊" redirectTo="/" />

      <AuthDivider />

      <form onSubmit={handleSignup} className="space-y-4">
          <AuthField id="displayName" label="顯示名稱" icon={User}>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如何稱呼你"
              className="h-11 pl-10"
            />
          </AuthField>
          <AuthField id="email" label="電子郵件" icon={Mail}>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-11 pl-10"
            />
          </AuthField>
          <AuthField id="password" label="密碼" icon={Lock}>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              required
              minLength={6}
              className="h-11 pl-10"
            />
          </AuthField>
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
            {loading ? '註冊中...' : '建立帳號'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-gray-400">
        註冊即表示你同意我們的服務條款與私隱政策
      </p>
    </AuthPageShell>
  );
}
