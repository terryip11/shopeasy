import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { firePushToUser } from '@/lib/push/send';

type OrderPartyRow = {
  id: string;
  user_id: string;
  merchant_id: string | null;
};

type MerchantOwnerRow = {
  id: string;
  user_id: string;
};

function orderUrl(orderId: string) {
  return `/orders/${orderId}`;
}

function merchantOrderUrl(orderId: string) {
  return `/dashboard/orders/${orderId}`;
}

async function getOrderParties(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, merchant_id')
    .eq('id', orderId)
    .maybeSingle();

  const row = order as OrderPartyRow | null;
  if (!row) return null;

  let merchantOwnerId: string | null = null;
  if (row.merchant_id) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('user_id')
      .eq('id', row.merchant_id)
      .maybeSingle();
    merchantOwnerId = (merchant as { user_id: string } | null)?.user_id ?? null;
  }

  return {
    orderId: row.id,
    buyerId: row.user_id,
    merchantOwnerId,
  };
}

export async function notifyOrdersPaid(orderIds: string[]) {
  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, user_id, merchant_id, status')
    .in('id', orderIds)
    .eq('status', 'paid');

  const list = (orders || []) as OrderPartyRow[];
  if (list.length === 0) return;

  const merchantIds = [...new Set(list.map((o) => o.merchant_id).filter(Boolean))] as string[];
  const merchantOwners = new Map<string, string>();

  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, user_id')
      .in('id', merchantIds);
    for (const m of (merchants || []) as MerchantOwnerRow[]) {
      if (m.user_id) merchantOwners.set(m.id, m.user_id);
    }
  }

  for (const order of list) {
    const shortId = order.id.slice(0, 8);
    firePushToUser(order.user_id, {
      title: '付款成功',
      body: `訂單 #${shortId} 已付款，商家將盡快處理`,
      url: orderUrl(order.id),
      tag: `order-${order.id}`,
    });

    if (order.merchant_id) {
      const ownerId = merchantOwners.get(order.merchant_id);
      if (ownerId) {
        firePushToUser(ownerId, {
          title: '新訂單已付款',
          body: `訂單 #${shortId} 待發貨，請盡快處理`,
          url: merchantOrderUrl(order.id),
          tag: `merchant-order-${order.id}`,
        });
      }
    }
  }
}

export async function notifyOrderShipped(orderId: string, trackingNumber?: string | null) {
  const parties = await getOrderParties(orderId);
  if (!parties) return;

  const shortId = orderId.slice(0, 8);
  const tracking = trackingNumber?.trim();
  firePushToUser(parties.buyerId, {
    title: '訂單已發貨',
    body: tracking
      ? `訂單 #${shortId} 已發貨，追蹤號：${tracking}`
      : `訂單 #${shortId} 已發貨`,
    url: orderUrl(orderId),
    tag: `order-shipped-${orderId}`,
  });
}

export async function notifyDeliveryClaimed(orderId: string) {
  const parties = await getOrderParties(orderId);
  if (!parties) return;

  firePushToUser(parties.buyerId, {
    title: '配送員已接單',
    body: `訂單 #${orderId.slice(0, 8)} 配送員已接單，即將為您配送`,
    url: orderUrl(orderId),
    tag: `delivery-claimed-${orderId}`,
  });
}

export async function notifyDeliveryStatus(
  orderId: string,
  status: 'picked_up' | 'delivered' | 'failed'
) {
  const parties = await getOrderParties(orderId);
  if (!parties) return;

  const shortId = orderId.slice(0, 8);
  const messages: Record<typeof status, { title: string; body: string }> = {
    picked_up: {
      title: '配送中',
      body: `訂單 #${shortId} 配送員已取件，正在送往您手中`,
    },
    delivered: {
      title: '已送達',
      body: `訂單 #${shortId} 已送達，感謝您的購買`,
    },
    failed: {
      title: '配送異常',
      body: `訂單 #${shortId} 配送遇到問題，請聯絡商家或客服`,
    },
  };

  const msg = messages[status];
  firePushToUser(parties.buyerId, {
    ...msg,
    url: orderUrl(orderId),
    tag: `delivery-${status}-${orderId}`,
  });
}

export async function notifyMerchantNewPendingOrder(orderId: string, merchantId: string) {
  const supabase = createAdminClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('user_id')
    .eq('id', merchantId)
    .maybeSingle();

  const ownerId = (merchant as { user_id: string } | null)?.user_id;
  if (!ownerId) return;

  firePushToUser(ownerId, {
    title: '新訂單待付款',
    body: `訂單 #${orderId.slice(0, 8)} 已建立，等待買家付款`,
    url: merchantOrderUrl(orderId),
    tag: `merchant-pending-${orderId}`,
  });
}

export async function notifyMerchantBuyerClaimedPayment(orderId: string, merchantId: string) {
  const supabase = createAdminClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('user_id')
    .eq('id', merchantId)
    .maybeSingle();

  const ownerId = (merchant as { user_id: string } | null)?.user_id;
  if (!ownerId) return;

  firePushToUser(ownerId, {
    title: '買家已回報付款',
    body: `訂單 #${orderId.slice(0, 8)} 待您核對款項並確認收款`,
    url: merchantOrderUrl(orderId),
    tag: `merchant-claimed-${orderId}`,
  });
}
