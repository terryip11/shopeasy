import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AdminOrderRow = {
  id: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  merchant_name: string | null;
  buyer_name: string | null;
  total: number;
  status: string;
  payment_method: string | null;
  tracking_number: string | null;
  created_at: string;
};

export async function getAdminOrdersList(page = 1, limit = 50): Promise<{
  orders: AdminOrderRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}> {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await (supabase as any)
    .from('orders')
    .select(
      `
      id, total, status, tracking_number, user_id, merchant_id,
      shipping_name, shipping_phone, payment_method, created_at,
      merchants ( name )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const orders = (data || []) as Array<{
    id: string;
    total: number;
    status: string;
    tracking_number: string | null;
    user_id: string | null;
    merchant_id: string | null;
    shipping_name: string | null;
    shipping_phone: string | null;
    payment_method: string | null;
    created_at: string;
    merchants: { name: string } | { name: string }[] | null;
  }>;

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))] as string[];

  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    for (const p of (profiles || []) as { id: string; display_name: string | null }[]) {
      profileMap.set(p.id, p.display_name?.trim() || '');
    }
  }

  const rows: AdminOrderRow[] = orders.map((o) => {
    const merchant = Array.isArray(o.merchants) ? o.merchants[0] : o.merchants;
    return {
      id: o.id,
      shipping_name: o.shipping_name,
      shipping_phone: o.shipping_phone,
      merchant_name: merchant?.name ?? null,
      buyer_name: o.user_id ? profileMap.get(o.user_id) || null : null,
      total: Number(o.total),
      status: o.status,
      payment_method: o.payment_method,
      tracking_number: o.tracking_number,
      created_at: o.created_at,
    };
  });

  const totalCount = count ?? rows.length;
  return {
    orders: rows,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}
