/**
 * src/lib/auth/client.tsx
 * Auth 客戶端工具
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import { type Session } from '@supabase/supabase-js';
import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from './roles';

export function createBrowserSupabaseClient() {
  return createClient();
}

export function SupabaseAuthListener({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // 僅在登入／登出時刷新，避免 TOKEN_REFRESHED 造成頁面不停跳動
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return <>{children}</>;
}

export type AuthState = {
  user: Session['user'] | null;
  role: UserRole | null;
};
