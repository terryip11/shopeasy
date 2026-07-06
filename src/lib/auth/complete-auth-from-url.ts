import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type BrowserSupabase = SupabaseClient<Database>;

function parseHashTokens() {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

function clearUrlHash() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.hash) return;
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

async function waitForSession(supabase: BrowserSupabase, attempts = 24) {
  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return null;
}

/** 從目前網址（?code= 或 #access_token）建立 Supabase session */
export async function completeAuthFromCurrentUrl(supabase: BrowserSupabase) {
  const url = new URL(window.location.href);
  const oauthError = url.searchParams.get('error') || new URLSearchParams(url.hash.slice(1)).get('error');
  if (oauthError) {
    throw new Error(oauthError);
  }

  const hashTokens = parseHashTokens();
  if (hashTokens) {
    const { error } = await supabase.auth.setSession(hashTokens);
    if (error) throw error;
    clearUrlHash();
  }

  const code = url.searchParams.get('code');
  if (code) {
    throw new Error('USE_OAUTH_CALLBACK');
  }

  const session = await waitForSession(supabase);
  if (!session) {
    throw new Error('SESSION_MISSING');
  }

  return session;
}
