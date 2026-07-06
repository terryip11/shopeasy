import 'server-only';

/**
 * 服務端認證輔助
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { UserRole } from './permissions';
import {
  ADMIN_ROLES,
  FINANCE_ROLES,
  hasPermission,
  isAdminRole,
  type AdminPermission,
} from './permissions';

type Merchant = Database['public']['Tables']['merchants']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, role, display_name, created_at')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getProfile();
  return (profile?.role as UserRole) ?? null;
}

export async function requireRole(allowed: UserRole[]) {
  const user = await getAuthUser();
  if (!user) {
    return { authorized: false as const, role: null, user: null };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = ((data as { role: UserRole } | null)?.role) ?? null;

  if (!role || !allowed.includes(role)) {
    return { authorized: false as const, role, user };
  }
  return { authorized: true as const, role, user };
}

export async function requireAdmin() {
  return requireRole(ADMIN_ROLES);
}

export async function requireFinanceStaff() {
  return requireRole(FINANCE_ROLES);
}

export async function requirePermission(permission: AdminPermission) {
  const user = await getAuthUser();
  if (!user) {
    return { authorized: false as const, role: null, user: null };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = ((data as { role: UserRole } | null)?.role) ?? null;

  if (!hasPermission(role, permission)) {
    return { authorized: false as const, role, user };
  }
  return { authorized: true as const, role, user };
}

export async function getMerchantForUser(): Promise<Merchant | null> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return data as Merchant | null;
}

/** 僅返回已通過審核的店鋪（商家後台用） */
export async function getActiveMerchantForUser(): Promise<Merchant | null> {
  const merchant = await getMerchantForUser();
  if (!merchant || merchant.status !== 'active') return null;
  return merchant;
}

export { isAdminRole, hasPermission };
