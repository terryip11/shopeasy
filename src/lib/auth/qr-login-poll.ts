import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import type { UserRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/database';

const POLL_TTL_MS = 5 * 60 * 1000;

export type QrPollStatus = 'pending' | 'confirmed' | 'consumed' | 'expired';

type PollRow = Database['public']['Tables']['qr_login_polls']['Row'];
type PollUpdate = Database['public']['Tables']['qr_login_polls']['Update'];
type PollInsert = Database['public']['Tables']['qr_login_polls']['Insert'];

function admin() {
  return createAdminClient();
}

function pollTable() {
  // qr_login_polls 尚未納入 generated types 的完整推斷
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return admin().from('qr_login_polls') as any;
}

function isExpired(row: PollRow) {
  return new Date(row.expires_at).getTime() <= Date.now();
}

async function markExpired(id: string) {
  const patch: PollUpdate = { status: 'expired' };
  await pollTable()
    .update(patch)
    .eq('id', id)
    .eq('status', 'pending');
}

export async function createQrLoginPoll(email: string): Promise<string> {
  const expiresAt = new Date(Date.now() + POLL_TTL_MS).toISOString();
  const row: PollInsert = {
    email: email.trim().toLowerCase(),
    expires_at: expiresAt,
  };
  const { data, error } = await pollTable()
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'POLL_CREATE_FAILED');
  }

  return (data as { id: string }).id;
}

export async function getQrLoginPollStatus(pollId: string): Promise<QrPollStatus> {
  const { data, error } = await pollTable()
    .select('id, email, user_id, status, expires_at, confirmed_at')
    .eq('id', pollId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('POLL_NOT_FOUND');

  const row = data as PollRow;
  if (row.status === 'pending' && isExpired(row)) {
    await markExpired(row.id);
    return 'expired';
  }

  return row.status;
}

export async function confirmQrLoginPoll(pollId: string, userId: string, userEmail: string) {
  const { data, error } = await pollTable()
    .select('id, email, user_id, status, expires_at, confirmed_at')
    .eq('id', pollId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('POLL_NOT_FOUND');

  const row = data as PollRow;
  if (row.status !== 'pending') throw new Error('POLL_NOT_PENDING');
  if (isExpired(row)) {
    await markExpired(row.id);
    throw new Error('POLL_EXPIRED');
  }

  const normalized = userEmail.trim().toLowerCase();
  if (row.email !== normalized) {
    throw new Error('EMAIL_MISMATCH');
  }

  const patch: PollUpdate = {
    status: 'confirmed',
    user_id: userId,
    confirmed_at: new Date().toISOString(),
  };
  const { error: updateError } = await pollTable()
    .update(patch)
    .eq('id', pollId)
    .eq('status', 'pending');

  if (updateError) throw new Error(updateError.message);
}

async function mintSessionForEmail(email: string) {
  const client = admin();
  const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    throw new Error(linkError?.message || 'LINK_FAILED');
  }

  const { data, error } = await client.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'email',
  });

  if (error || !data.session) {
    throw new Error(error?.message || 'SESSION_FAILED');
  }

  return data.session;
}

export async function consumeQrLoginPollForDesktop(pollId: string) {
  const { data, error } = await pollTable()
    .select('id, email, user_id, status, expires_at, confirmed_at')
    .eq('id', pollId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('POLL_NOT_FOUND');

  const row = data as PollRow;
  if (row.status === 'consumed') throw new Error('POLL_CONSUMED');
  if (row.status !== 'confirmed' || !row.user_id) throw new Error('POLL_NOT_CONFIRMED');
  if (isExpired(row)) throw new Error('POLL_EXPIRED');

  const session = await mintSessionForEmail(row.email);

  const { data: profile } = await admin()
    .from('profiles')
    .select('role')
    .eq('id', row.user_id)
    .maybeSingle();

  const role = profile ? ((profile as { role: UserRole }).role ?? null) : null;
  const redirectTo = resolvePostLoginPath(role, '/');

  const consumed: PollUpdate = { status: 'consumed' };
  const { error: updateError } = await pollTable()
    .update(consumed)
    .eq('id', pollId)
    .eq('status', 'confirmed');

  if (updateError) throw new Error(updateError.message);

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    redirectTo,
  };
}
