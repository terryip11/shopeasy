import 'server-only';

/**
 * 商家後台資料查詢（使用 session client + RLS）
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import type { Database } from '@/types/database';
import { pickPrimaryDeliveryJobsPerOrder } from '@/lib/delivery/pick-primary-job';
import type { MerchantDeliveryJobSummary } from '@/lib/merchant/delivery-job-summary';

export type { MerchantDeliveryJobSummary };

type Order = Database['public']['Tables']['orders']['Row'];
type Product = Database['public']['Tables']['products']['Row'] & {
  merchants?: { name: string; slug: string } | null;
};

export async function requireMerchant() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) return null;
  return merchant;
}

export async function getMerchantProducts(page = 1, limit = 10) {
  const merchant = await requireMerchant();
  if (!merchant) return { products: [], totalCount: 0, page, limit, totalPages: 0 };

  const supabase = await createClient();
  const from = (page - 1) * limit;
  const { data: products, count } = await supabase
    .from('products')
    .select('*, merchants (name, slug)', { count: 'exact' })
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  return {
    products: (products || []) as Product[],
    totalCount: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getMerchantOrders(page = 1, limit = 10) {
  const merchant = await requireMerchant();
  if (!merchant) return { orders: [], totalCount: 0, page, limit, totalPages: 0, deliveryJobs: {} };

  const supabase = await createClient();
  const from = (page - 1) * limit;
  const { data: orders, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  const orderList = (orders || []) as Order[];
  const deliveryJobs = await getDeliveryJobsForOrders(orderList.map((o) => o.id));

  return {
    orders: orderList,
    totalCount: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    deliveryJobs,
  };
}

type DeliveryJobSummary = MerchantDeliveryJobSummary;

async function getCourierContactInfo(courierIds: string[]): Promise<{
  names: Record<string, string>;
  phones: Record<string, string>;
}> {
  if (courierIds.length === 0) return { names: {}, phones: {} };

  const admin = createAdminClient();
  const [{ data: profiles }, { data: courierProfiles }] = await Promise.all([
    admin.from('profiles').select('id, display_name').in('id', courierIds),
    admin.from('courier_profiles').select('user_id, phone').in('user_id', courierIds),
  ]);

  const names: Record<string, string> = {};
  for (const p of profiles || []) {
    const row = p as { id: string; display_name: string | null };
    names[row.id] = row.display_name?.trim() || '配送員';
  }

  const phones: Record<string, string> = {};
  for (const p of courierProfiles || []) {
    const row = p as { user_id: string; phone: string | null };
    if (row.phone?.trim()) phones[row.user_id] = row.phone.trim();
  }

  return { names, phones };
}

export async function getDeliveryJobsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) return {} as Record<string, DeliveryJobSummary>;

  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_jobs')
    .select(
      'id, order_id, job_type, status, courier_id, dropoff_address, assigned_at, delivered_at, created_at'
    )
    .in('order_id', orderIds);

  const rows = (data || []) as Pick<
    Database['public']['Tables']['delivery_jobs']['Row'],
    | 'id'
    | 'order_id'
    | 'job_type'
    | 'status'
    | 'courier_id'
    | 'dropoff_address'
    | 'assigned_at'
    | 'delivered_at'
    | 'created_at'
  >[];

  const primaryByOrder = pickPrimaryDeliveryJobsPerOrder(rows);
  const courierIds = [
    ...new Set(Object.values(primaryByOrder).map((r) => r.courier_id).filter(Boolean)),
  ] as string[];
  const { names: courierNames, phones: courierPhones } = await getCourierContactInfo(courierIds);

  const map: Record<string, DeliveryJobSummary> = {};
  for (const [orderId, job] of Object.entries(primaryByOrder)) {
    map[orderId] = {
      ...job,
      courier_name: job.courier_id ? courierNames[job.courier_id] ?? '配送員' : null,
      courier_phone: job.courier_id ? courierPhones[job.courier_id] ?? null : null,
    };
  }
  return map;
}

export async function getMerchantOrderAttention() {
  const merchant = await requireMerchant();
  if (!merchant) return { pending: 0, paid: 0, attention: 0 };

  const supabase = await createClient();
  const [{ count: pending }, { count: paid }] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'paid'),
  ]);

  const p = pending || 0;
  const pd = paid || 0;
  return { pending: p, paid: pd, attention: p + pd };
}

export async function getMerchantDashboardStats() {
  const merchant = await requireMerchant();
  if (!merchant) {
    return {
      productsCount: 0,
      ordersCount: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      recentOrders: [],
      deliveryJobs: {} as Record<string, DeliveryJobSummary>,
    };
  }

  const supabase = await createClient();

  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id);

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, id, created_at')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });

  const ordersList = (orders || []) as Pick<Order, 'total' | 'status' | 'id' | 'created_at'>[];
  const ordersCount = ordersList.length;
  const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = ordersList.filter((o) => o.status === 'pending').length;
  const recentOrders = ordersList.slice(0, 5) as Order[];
  const deliveryJobs = await getDeliveryJobsForOrders(recentOrders.map((o) => o.id));

  return {
    productsCount: productsCount || 0,
    ordersCount,
    totalRevenue,
    pendingOrders,
    recentOrders,
    deliveryJobs,
  };
}

export async function getMerchantProduct(productId: string) {
  const merchant = await requireMerchant();
  if (!merchant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('merchant_id', merchant.id)
    .single();

  return data as Product | null;
}
