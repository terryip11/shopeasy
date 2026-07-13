'use client';

import { createClient } from '@/lib/supabase/client';
import { sanitizeDevOrigin } from '@/lib/auth/sanitize-dev-origin';

export const OAUTH_NEXT_STORAGE_KEY = 'shopeasy_oauth_next';

/** OAuth 完成後要前往的路徑（不可放在 redirectTo，否則 Supabase 白名單可能不匹配而 fallback 到 localhost） */
export function stashOAuthNextPath(nextPath: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(OAUTH_NEXT_STORAGE_KEY, nextPath);
  }
}

export function takeOAuthNextPath(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;
  const stored = sessionStorage.getItem(OAUTH_NEXT_STORAGE_KEY);
  if (stored) sessionStorage.removeItem(OAUTH_NEXT_STORAGE_KEY);
  return stored || fallback;
}

export function getOAuthCallbackUrl() {
  const raw =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const base = sanitizeDevOrigin(raw);
  return `${base}/auth/callback`;
}

export async function signInWithGoogle(nextPath = '/') {
  if (typeof window === 'undefined') {
    return { message: '請在瀏覽器中登入' } as const;
  }

  stashOAuthNextPath(nextPath);
  const supabase = createClient();
  const redirectTo = getOAuthCallbackUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) return error;

  if (data?.url) {
    window.location.assign(data.url);
    return null;
  }

  return {
    message:
      '無法開啟 Google 登入，請確認 Supabase 已啟用 Google 提供者，並將 ' +
      `${redirectTo} 加入 Redirect URLs`,
  } as const;
}
