import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminUserRow } from '@/components/admin/user-role-manager';
import type { UserCapability } from '@/lib/auth/capabilities';

const AUTH_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  email: '電郵',
  apple: 'Apple',
  facebook: 'Facebook',
};

function authProviderLabel(provider: string | null | undefined): string | null {
  if (!provider) return null;
  return AUTH_PROVIDER_LABELS[provider] ?? provider;
}

async function fetchAuthContactByUserId(
  userIds: string[]
): Promise<Map<string, { email: string | null; phone: string | null; auth_provider: string | null }>> {
  const supabase = createAdminClient();
  const map = new Map<string, { email: string | null; phone: string | null; auth_provider: string | null }>();
  if (userIds.length === 0) return map;

  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const user = data?.user;
      if (!user) return;

      const provider =
        (typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null) ??
        user.identities?.[0]?.provider ??
        null;

      map.set(userId, {
        email: user.email?.trim() || null,
        phone: user.phone?.trim() || null,
        auth_provider: authProviderLabel(provider),
      });
    })
  );

  return map;
}

export async function listAdminUsers(limit = 100): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: capabilities }, { data: couriers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('user_capabilities').select('user_id, capability'),
    supabase.from('courier_profiles').select('user_id, status, phone'),
  ]);

  const profileRows = (profiles || []) as Omit<
    AdminUserRow,
    'capabilities' | 'courier_status' | 'email' | 'phone' | 'auth_provider'
  >[];

  const userIds = profileRows.map((p) => p.id);

  const [authContacts, buyerPhonesRes, merchantContactsRes] = await Promise.all([
    fetchAuthContactByUserId(userIds),
    userIds.length > 0
      ? supabase
          .from('buyer_addresses')
          .select('user_id, phone')
          .in('user_id', userIds)
          .eq('is_default', true)
      : Promise.resolve({ data: [] as { user_id: string; phone: string }[] }),
    userIds.length > 0
      ? supabase
          .from('merchants')
          .select('user_id, contact_phone, contact_email')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string; contact_phone: string | null; contact_email: string | null }[] }),
  ]);

  const capsByUser = new Map<string, UserCapability[]>();
  for (const row of capabilities || []) {
    const r = row as { user_id: string; capability: UserCapability };
    const list = capsByUser.get(r.user_id) || [];
    list.push(r.capability);
    capsByUser.set(r.user_id, list);
  }

  const courierByUser = new Map<string, { status: string; phone: string | null }>();
  for (const row of couriers || []) {
    const r = row as { user_id: string; status: string; phone: string | null };
    courierByUser.set(r.user_id, { status: r.status, phone: r.phone });
  }

  const buyerPhoneByUser = new Map<string, string>();
  for (const row of buyerPhonesRes.data || []) {
    const r = row as { user_id: string; phone: string };
    if (r.phone?.trim()) buyerPhoneByUser.set(r.user_id, r.phone.trim());
  }

  const merchantContactByUser = new Map<string, { phone: string | null; email: string | null }>();
  for (const row of merchantContactsRes.data || []) {
    const r = row as { user_id: string; contact_phone: string | null; contact_email: string | null };
    merchantContactByUser.set(r.user_id, {
      phone: r.contact_phone?.trim() || null,
      email: r.contact_email?.trim() || null,
    });
  }

  return profileRows.map((p) => {
    const auth = authContacts.get(p.id);
    const courier = courierByUser.get(p.id);
    const merchant = merchantContactByUser.get(p.id);
    const buyerPhone = buyerPhoneByUser.get(p.id) ?? null;

    const email = auth?.email ?? merchant?.email ?? null;
    const phone =
      courier?.phone?.trim() ||
      buyerPhone ||
      merchant?.phone ||
      auth?.phone ||
      null;

    return {
      ...p,
      email,
      phone,
      auth_provider: auth?.auth_provider ?? null,
      capabilities: capsByUser.get(p.id) || [],
      courier_status: courier?.status ?? null,
    };
  });
}
