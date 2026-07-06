'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { completeAuthFromCurrentUrl } from '@/lib/auth/complete-auth-from-url';

/**
 * Magic link 若落到根路徑並帶 #access_token，先建立 session 再導向 callback。
 */
export function AuthHashRecovery() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/auth/callback') return;

    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    const params = new URLSearchParams(hash);
    if (!params.has('access_token') && !params.has('error')) return;

    const supabase = createClient();

    void (async () => {
      try {
        await completeAuthFromCurrentUrl(supabase);
        router.replace('/auth/callback');
        router.refresh();
      } catch {
        router.replace('/login?error=verify_failed');
      }
    })();
  }, [router]);

  return null;
}
