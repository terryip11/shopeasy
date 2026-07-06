import 'server-only';

/**
 * 買家訂單查詢
 */

import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/server';
import { ACTIVE_ORDER_STATUSES, CLOSED_ORDER_STATUSES } from '@/lib/orders/types';
import { pickPrimaryDeliveryJob } from '@/lib/delivery/pick-primary-job';
import type { Database } from '@/types/database';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderWithMerchant = Order & {
  merchants?: { name: string; slug: string } | null;
  deliveryJobStatus?: Database['public']['Tables']['delivery_jobs']['Row']['status'] | null;
};

export type BuyerOrderScope = 'active' | 'closed' | 'all';

export async function getBuyerOrders(
  page = 1,
  limit = 20,
  scope: BuyerOrderScope = 'active'
) {
  const user = await getAuthUser();
  if (!user) return { orders: [], totalCount: 0, page, limit, totalPages: 0 };

  const supabase = await createClient();
  const from = (page - 1) * limit;

  let query = supabase
    .from('orders')
    .select('*, merchants (name, slug)', { count: 'exact' })
    .eq('user_id', user.id);

  if (scope === 'active') {
    query = query.in('status', ACTIVE_ORDER_STATUSES);
  } else if (scope === 'closed') {
    query = query.in('status', CLOSED_ORDER_STATUSES);
  }

  const { data: orders, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  const orderList = (orders || []) as OrderWithMerchant[];
  const deliveryStatusByOrder = await getDeliveryStatusByOrderIds(orderList.map((o) => o.id));

  return {
    orders: orderList.map((o) => ({
      ...o,
      deliveryJobStatus: deliveryStatusByOrder.get(o.id) ?? null,
    })),
    totalCount: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getBuyerOrder(orderId: string) {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('*, merchants (name, slug)')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (!data) return null;

  const order = data as Order & { merchants?: { name: string; slug: string } | null };
  const deliveryJob = await getDeliveryJobForOrder(orderId);

  let courierRatingSubmitted = false;
  if (deliveryJob?.status === 'delivered') {
    const { data: rating } = await (supabase as any)
      .from('courier_ratings')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    courierRatingSubmitted = !!rating;
  }

  return { ...order, deliveryJob, courierRatingSubmitted };
}

export async function getDeliveryJobForOrder(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_jobs')
    .select('id, job_type, status, assigned_at, picked_up_at, delivered_at, courier_id')
    .eq('order_id', orderId)
    .in('status', ['pending', 'assigned', 'picked_up', 'delivered'])
    .order('created_at', { ascending: false });

  const jobs = (data || []) as Database['public']['Tables']['delivery_jobs']['Row'][];
  return pickPrimaryDeliveryJob(jobs) ?? null;
}

async function getDeliveryStatusByOrderIds(orderIds: string[]) {
  const map = new Map<string, Database['public']['Tables']['delivery_jobs']['Row']['status']>();
  if (orderIds.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_jobs')
    .select('order_id, status, courier_id, assigned_at, picked_up_at, delivered_at, created_at')
    .in('order_id', orderIds)
    .in('status', ['pending', 'assigned', 'picked_up', 'delivered']);

  const byOrder = new Map<string, Database['public']['Tables']['delivery_jobs']['Row'][]>();
  for (const raw of (data || []) as Database['public']['Tables']['delivery_jobs']['Row'][]) {
    const list = byOrder.get(raw.order_id) ?? [];
    list.push(raw);
    byOrder.set(raw.order_id, list);
  }

  for (const [orderId, jobs] of byOrder) {
    const primary = pickPrimaryDeliveryJob(jobs);
    if (primary) map.set(orderId, primary.status);
  }

  return map;
}
