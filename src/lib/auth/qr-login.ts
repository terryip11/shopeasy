import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveRedirectOrigin } from '@/lib/auth/app-origin';
import { createQrLoginPoll } from '@/lib/auth/qr-login-poll';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import { ADMIN_ROLES, type UserRole } from '@/lib/auth/permissions';
import type { User } from '@supabase/supabase-js';

export function isQrLoginRole(role: UserRole | null | undefined): boolean {
  return role != null && ADMIN_ROLES.includes(role);
}

export function isQrLoginEnabled(): boolean {
  if (process.env.QR_LOGIN_ENABLED === 'false') return false;
  if (process.env.ACCOUNTANT_QR_LOGIN_ENABLED === 'false') return false;
  return true;
}

/** 依 email 查找 auth 用戶 */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (user) return user;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

/** 確保 magic link 內的 redirect_to 指向手機可連線的網址 */
export function patchMagicLinkRedirect(actionLink: string, redirectTo: string): string {
  try {
    const url = new URL(actionLink);
    url.searchParams.set('redirect_to', redirectTo);
    return url.toString();
  } catch {
    return actionLink;
  }
}

export async function createQrLoginUrl(
  email: string,
  options?: { redirectOrigin?: string | null }
): Promise<{ loginUrl: string; pollId: string }> {
  const admin = createAdminClient();
  const user = await findAuthUserByEmail(email);
  if (!user?.email) {
    throw new Error('NOT_FOUND');
  }

  const pollId = await createQrLoginPoll(user.email);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile ? ((profile as { role: UserRole }).role ?? null) : null;
  if (!isQrLoginRole(role)) {
    throw new Error('FORBIDDEN');
  }

  const appUrl = resolveRedirectOrigin(options?.redirectOrigin);
  const next = resolvePostLoginPath(role, '/');
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}&qr_poll=${pollId}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message || 'GENERATE_FAILED');
  }

  return {
    loginUrl: patchMagicLinkRedirect(data.properties.action_link, redirectTo),
    pollId,
  };
}
