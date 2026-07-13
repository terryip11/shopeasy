import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { MerchantStatus, MerchantTier } from '@/types/database';

export type AdminMerchantRow = {
  id: string;
  name: string;
  slug: string;
  status: MerchantStatus;
  tier: MerchantTier;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  br_image_url: string | null;
  ci_image_url: string | null;
  owner_display_name: string | null;
  owner_email: string | null;
  applied_at: string;
};

export async function getAdminMerchantsList(page = 1, limit = 50): Promise<{
  merchants: AdminMerchantRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}> {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await (supabase as any)
    .from('merchants')
    .select(
      'id, name, slug, user_id, status, tier, contact_name, contact_phone, contact_email, br_image_url, ci_image_url, applied_at',
      { count: 'exact' }
    )
    .order('applied_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const merchants = (data || []) as Array<{
    id: string;
    name: string;
    slug: string;
    user_id: string;
    status: MerchantStatus;
    tier: MerchantTier;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    br_image_url: string | null;
    ci_image_url: string | null;
    applied_at: string;
  }>;

  const userIds = [...new Set(merchants.map((m) => m.user_id).filter(Boolean))];

  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    for (const p of (profiles || []) as { id: string; display_name: string | null }[]) {
      if (p.display_name?.trim()) profileMap.set(p.id, p.display_name.trim());
    }
  }

  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email?.trim();
      if (email) emailMap.set(userId, email);
    })
  );

  const rows: AdminMerchantRow[] = merchants.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    status: m.status,
    tier: m.tier,
    contact_name: m.contact_name,
    contact_phone: m.contact_phone,
    contact_email: m.contact_email,
    br_image_url: m.br_image_url,
    ci_image_url: m.ci_image_url,
    owner_display_name: profileMap.get(m.user_id) ?? null,
    owner_email: emailMap.get(m.user_id) ?? null,
    applied_at: m.applied_at,
  }));

  const totalCount = count ?? rows.length;
  return {
    merchants: rows,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

function ownerLabel(row: AdminMerchantRow): string {
  return (
    row.contact_name?.trim() ||
    row.owner_display_name?.trim() ||
    row.owner_email?.trim() ||
    row.contact_email?.trim() ||
    '—'
  );
}

export { ownerLabel };
