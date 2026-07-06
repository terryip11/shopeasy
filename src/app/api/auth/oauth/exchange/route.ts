import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth/permissions';
import { sanitizeDevOrigin } from '@/lib/auth/sanitize-dev-origin';
import { resolvePostLoginPath } from '@/lib/auth/post-login';

function redirectTo(requestUrl: URL, path: string) {
  const origin = sanitizeDevOrigin(requestUrl.origin);
  return NextResponse.redirect(new URL(path, `${origin}/`));
}

/** Google / PKCE：在伺服器交換 code 並寫入 cookie（與 /auth/callback 頁面分流） */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const oauthError = requestUrl.searchParams.get('error');

  if (oauthError) {
    return redirectTo(requestUrl, '/login?error=oauth_failed');
  }

  if (!code) {
    return redirectTo(requestUrl, '/login?error=missing_code');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[api/auth/oauth/exchange]', error.message);
    return redirectTo(
      requestUrl,
      `/login?error=verify_failed&detail=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    role = profile ? (profile as { role: UserRole }).role : null;
  }

  return redirectTo(requestUrl, resolvePostLoginPath(role, next));
}
