import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { allocateInfraCostForOrder } from '@/lib/finance/infra-allocation';
import { roundMoney } from '@/lib/finance/config';
import { getEffectivePlatformFeeRate } from '@/lib/finance/monetization';
import { resolveStripeFeeHkd } from '@/lib/finance/stripe-fee';
import { recordAffiliateCommission, reverseAffiliateCommission } from '@/lib/affiliate/commission';
import {
  deductPlatformCreditForOrder,
  refundPlatformCreditForOrder,
} from '@/lib/finance/platform-credit';
import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

type OrderRow = {
  id: string;
  merchant_id: string | null;
  total: number;
  subtotal: number | null;
  payment_method: string | null;
  stripe_payment_id: string | null;
  status: string;
  share_link_id: string | null;
  promoter_id: string | null;
  affiliate_commission_amount: number | null;
  affiliate_platform_fee: number | null;
};

/** 訂單標記已付款後寫入財務分錄（冪等） */
export async function recordOrderLedger(
  orderId: string,
  paymentId?: string | null
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await (supabase as any)
    .from('order_ledger')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    return { ok: true, skipped: true };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, merchant_id, total, subtotal, payment_method, stripe_payment_id, status, share_link_id, promoter_id, affiliate_commission_amount, affiliate_platform_fee'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message || '訂單不存在' };
  }

  const row = order as OrderRow;
  if (!row.merchant_id) {
    return { ok: false, error: '訂單缺少商家' };
  }

  const { data: merchantRow } = await supabase
    .from('merchants')
    .select('tier')
    .eq('id', row.merchant_id)
    .maybeSingle();

  const gmv = roundMoney(Number(row.total));
  const paymentMethod = row.payment_method || 'card';
  const isCard = paymentMethod === 'card';

  const stripeFee = isCard
    ? await resolveStripeFeeHkd(paymentId ?? row.stripe_payment_id, gmv)
    : 0;

  const platformFeeRate = await getEffectivePlatformFeeRate(
    (merchantRow as { tier?: string | null } | null)?.tier
  );
  const platformFeeAmount = roundMoney(gmv * platformFeeRate);
  const paidAt = new Date();
  const infraCostAllocated = await allocateInfraCostForOrder(paidAt);

  const affiliateResult = await recordAffiliateCommission(orderId);
  if (!affiliateResult.ok && !affiliateResult.skipped) {
    console.error('[ledger] affiliate commission failed:', affiliateResult.error);
  }

  const { data: orderAfterAffiliate } = await supabase
    .from('orders')
    .select('affiliate_commission_amount, affiliate_platform_fee, promoter_id')
    .eq('id', orderId)
    .maybeSingle();

  const affiliateCommission = roundMoney(
    Number((orderAfterAffiliate as OrderRow | null)?.affiliate_commission_amount ?? 0)
  );
  const affiliatePlatformFee = roundMoney(
    Number((orderAfterAffiliate as OrderRow | null)?.affiliate_platform_fee ?? 0)
  );
  const promoterId = (orderAfterAffiliate as OrderRow | null)?.promoter_id ?? null;

  const merchantNet = roundMoney(
    gmv - stripeFee - platformFeeAmount - infraCostAllocated - affiliateCommission
  );
  const platformNet = roundMoney(
    platformFeeAmount - infraCostAllocated + affiliatePlatformFee
  );

  const method = paymentMethod as MerchantPaymentMethod;
  const needsCreditDeduct = isManualPaymentMethod(method) && platformFeeAmount > 0;

  if (needsCreditDeduct) {
    const credit = await deductPlatformCreditForOrder(
      row.merchant_id,
      orderId,
      platformFeeAmount
    );
    if (!credit.ok) {
      return {
        ok: false,
        error: credit.error || '預付餘額扣款失敗',
      };
    }
  }

  const { error: insertError } = await (supabase as any).from('order_ledger').insert({
    order_id: orderId,
    merchant_id: row.merchant_id,
    gmv,
    payment_method: paymentMethod,
    currency: 'hkd',
    stripe_fee: stripeFee,
    platform_fee_rate: platformFeeRate,
    platform_fee_amount: platformFeeAmount,
    infra_cost_allocated: infraCostAllocated,
    delivery_cost: 0,
    merchant_net: merchantNet,
    platform_net: platformNet,
    affiliate_commission_amount: affiliateCommission,
    affiliate_platform_fee: affiliatePlatformFee,
    promoter_id: promoterId,
    settlement_status: 'recorded',
    paid_at: paidAt.toISOString(),
  });

  if (insertError) {
    if (needsCreditDeduct) {
      await refundPlatformCreditForOrder(orderId);
    }
    if (insertError.message?.includes('order_ledger')) {
      return {
        ok: false,
        error:
          '資料庫尚未建立 order_ledger，請執行 supabase/migrate-v18-finance.sql',
      };
    }
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

/** 為卡款分錄補算 Stripe 手續費（開發標記已付、或先前未寫入者） */
export async function syncLedgerStripeFees(): Promise<void> {
  const supabase = createAdminClient();

  const { data: rows } = await (supabase as any)
    .from('order_ledger')
    .select(
      'id, order_id, gmv, stripe_fee, platform_fee_amount, infra_cost_allocated, payment_method, settlement_status'
    )
    .eq('payment_method', 'card')
    .eq('stripe_fee', 0)
    .neq('settlement_status', 'reversed');

  for (const row of (rows || []) as Array<{
    id: string;
    order_id: string;
    gmv: number;
    platform_fee_amount: number;
    infra_cost_allocated: number;
  }>) {
    const { data: order } = await supabase
      .from('orders')
      .select('stripe_payment_id')
      .eq('id', row.order_id)
      .maybeSingle();

    const paymentId = (order as { stripe_payment_id: string | null } | null)?.stripe_payment_id;
    const stripeFee = await resolveStripeFeeHkd(paymentId, Number(row.gmv));
    if (stripeFee <= 0) continue;

    const gmv = Number(row.gmv);
    const platformFee = Number(row.platform_fee_amount);
    const infra = Number(row.infra_cost_allocated || 0);
    const merchantNet = roundMoney(gmv - stripeFee - platformFee - infra);
    const platformNet = roundMoney(platformFee - infra);

    await (supabase as any)
      .from('order_ledger')
      .update({
        stripe_fee: stripeFee,
        merchant_net: merchantNet,
        platform_net: platformNet,
      })
      .eq('id', row.id);
  }
}

/** 退款時沖銷分錄 */
export async function reverseOrderLedger(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  await reverseAffiliateCommission(orderId);
  await refundPlatformCreditForOrder(orderId);
  await (supabase as any)
    .from('order_ledger')
    .update({ settlement_status: 'reversed' })
    .eq('order_id', orderId)
    .neq('settlement_status', 'reversed');
}

/** 依 stripe_payment_id 沖銷 */
export async function reverseOrderLedgerByPaymentId(paymentIntentId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_id', paymentIntentId);

  for (const o of (orders || []) as { id: string }[]) {
    await reverseOrderLedger(o.id);
  }
}
