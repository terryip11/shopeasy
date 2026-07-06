'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { completeAuthFromCurrentUrl } from '@/lib/auth/complete-auth-from-url';
import { takeOAuthNextPath } from '@/lib/auth/oauth';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import type { UserRole } from '@/lib/auth/permissions';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('正在登入...');

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setMessage('登入逾時，請回到掃碼頁重新產生二維碼');
      }
    }, 20_000);

    async function completeLogin() {
      const supabase = createClient();
      const next = new URL(window.location.href).searchParams.get('next') ?? '/';

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code && !url.hash.includes('access_token')) {
          const next =
            url.searchParams.get('next') ?? takeOAuthNextPath('/');
          const exchangeParams = new URLSearchParams({ code });
          if (next !== '/') {
            exchangeParams.set('next', next);
          }
          window.location.replace(`/api/auth/oauth/exchange?${exchangeParams}`);
          return;
        }

        const session = await completeAuthFromCurrentUrl(supabase);
        if (cancelled) return;

        const qrPoll = new URL(window.location.href).searchParams.get('qr_poll');
        if (qrPoll) {
          await fetch('/api/auth/qr-login/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pollId: qrPoll }),
          });
        }

        let role: UserRole | null = null;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        role = profile ? (profile as { role: UserRole }).role : null;

        const destination = resolvePostLoginPath(role, next);
        window.location.replace(destination);
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof Error ? err.message : 'VERIFY_FAILED';
        if (code === 'SESSION_MISSING') {
          setMessage('登入連結無效或已過期，請重新掃碼');
          return;
        }
        if (code === 'USE_OAUTH_CALLBACK') {
          setMessage('登入連結無效，請從登入頁重試');
          return;
        }
        setMessage(`登入失敗：${code}`);
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      {message.includes('失敗') || message.includes('無效') || message.includes('逾時') ? (
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/login/qr" className="text-orange-600 hover:underline">
            返回掃碼登入
          </Link>
          <Link href="/login" className="text-gray-500 hover:underline">
            改用密碼登入
          </Link>
        </div>
      ) : null}
    </div>
  );
}
