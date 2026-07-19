import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { deductStockForOrders } from '@/lib/inventory';
import { createDeliveryJobFromOrder } from '@/lib/delivery/jobs';
import { recordOrderLedger } from '@/lib/finance/ledger';
import { notifyOrdersPaid } from '@/lib/push/notify-order';
import { defaultJobTypeForBusinessType } from '@/lib/merchant/business-type';
import { resolvePickupForOrderItems } from '@/lib/merchant/pickup-locations';
import { parseOrderItems } from '@/lib/orders/types';
import type { MerchantBusinessType } from '@/types/database';

type OrderRow = {
  id: string;
  status: string;
  shipping_address: string | null;
  shipping_zone_id: string | null;
  merchant_id: string;
  items: unknown;
};

type MerchantDeliveryDefaults = {
  business_type: MerchantBusinessType;
  company_address: string | null;
  default_pickup_address: string | null;
  default_pickup_contact_name: string | null;
  default_pickup_contact_phone: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

export type MarkOrdersPaidResult = {
  updated: number;
  deliveryJobs: number;
  errors: string[];
};

/** 將訂單標記為已付款並依商家業務類型建立配送任務 */
export async function markOrdersPaid(
  orderIds: string[],
  paymentId?: string
): Promise<MarkOrdersPaidResult> {
  const supabase = createAdminClient();
  const errors: string[] = [];

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, shipping_address, shipping_zone_id, merchant_id, items')
    .in('id', orderIds);

  const pendingIds = ((orders || []) as OrderRow[])
    .filter((o) => o.status === 'pending')
    .map((o) => o.id);

  if (pendingIds.length === 0) {
    return { updated: 0, deliveryJobs: 0, errors };
  }

  const patch: Record<string, unknown> = { status: 'paid' };
  if (paymentId) patch.stripe_payment_id = paymentId;

  const { data: updatedRows, error: updateError } = await (supabase as any)
    .from('orders')
    .update(patch)
    .in('id', pendingIds)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    throw new Error(updateError.message);
  }

  const actuallyUpdated = ((updatedRows || []) as { id: string }[]).map((r) => r.id);
  if (actuallyUpdated.length === 0) {
    return { updated: 0, deliveryJobs: 0, errors };
  }

  for (const orderId of actuallyUpdated) {
    const ledger = await recordOrderLedger(orderId, paymentId);
    if (!ledger.ok && !ledger.skipped) {
      const msg = `[markOrdersPaid] ledger ${orderId}: ${ledger.error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  try {
    await deductStockForOrders(actuallyUpdated);
  } catch (err) {
    const msg = `[markOrdersPaid] stock ${actuallyUpdated.join(',')}: ${(err as Error).message}`;
    console.error(msg);
    errors.push(msg);
  }

  const merchantIds = [
    ...new Set(
      ((orders || []) as OrderRow[])
        .filter((o) => actuallyUpdated.includes(o.id))
        .map((o) => o.merchant_id)
    ),
  ];

  const merchantDefaults = new Map<string, MerchantDeliveryDefaults>();
  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select(
        'id, business_type, company_address, default_pickup_address, default_pickup_contact_name, default_pickup_contact_phone, contact_name, contact_phone'
      )
      .in('id', merchantIds);

    for (const m of (merchants || []) as (MerchantDeliveryDefaults & { id: string })[]) {
      merchantDefaults.set(m.id, {
        business_type: m.business_type ?? 'retail',
        company_address: m.company_address,
        default_pickup_address: m.default_pickup_address,
        default_pickup_contact_name: m.default_pickup_contact_name,
        default_pickup_contact_phone: m.default_pickup_contact_phone,
        contact_name: m.contact_name,
        contact_phone: m.contact_phone,
      });
    }
  }

  let deliveryJobs = 0;
  for (const order of (orders || []) as OrderRow[]) {
    if (!actuallyUpdated.includes(order.id) || !order.shipping_address) continue;
    // 買家結帳不強制選區域；無 zone 時改由商家手動「建立配送」並指定區域
    if (!order.shipping_zone_id) continue;

    const merchant = merchantDefaults.get(order.merchant_id);
    const jobType = defaultJobTypeForBusinessType(merchant?.business_type);
    const productIds = parseOrderItems(order.items).map((i) => i.product_id);
    const pickup = await resolvePickupForOrderItems(
      order.merchant_id,
      productIds,
      merchant,
      { admin: true }
    );
    if (!pickup.address) {
      const msg = `[markOrdersPaid] delivery ${order.id}: 商家尚未設定取件點，略過自動建配送`;
      console.error(msg);
      errors.push(msg);
      continue;
    }

    const notes = [
      '買家結帳時自動建立',
      pickup.note,
      pickup.locationName ? `取件點：${pickup.locationName}` : null,
    ]
      .filter(Boolean)
      .join('；');

    const result = await createDeliveryJobFromOrder({
      orderId: order.id,
      jobType,
      zoneId: order.shipping_zone_id,
      pickupAddress: pickup.address,
      pickupContactName: pickup.contactName || undefined,
      pickupContactPhone: pickup.contactPhone || undefined,
      pickupLocationId: pickup.locationId,
      dropoffAddress: order.shipping_address,
      notes,
    });

    if (result.error) {
      const msg = `[markOrdersPaid] delivery ${order.id}: ${result.error.message}`;
      console.error(msg);
      errors.push(msg);
    } else {
      deliveryJobs += 1;
    }
  }

  void notifyOrdersPaid(actuallyUpdated);

  return { updated: actuallyUpdated.length, deliveryJobs, errors };
}
