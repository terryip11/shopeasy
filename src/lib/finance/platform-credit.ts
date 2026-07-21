import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getPlatformFeeRate, roundMoney } from '@/lib/finance/config';
import { getEffectivePlatformFeeRate } from '@/lib/finance/monetization';
import { isManualPaymentMethod } from '@/lib/checkout/payment-options';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import type { MerchantTier } from '@/types/database';

export type CreditLedgerEntry = {
  id: string;
  merchant_id: string;
  entry_type: 'topup' | 'deduct_order' | 'refund_order' | 'adjust';
  amount: number;
  balance_after: number;
  order_id: string | null;
  topup_request_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreditTopupRequest = {
  id: string;
  merchant_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  merchant_note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function getMerchantPlatformCreditBalance(merchantId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('merchants')
    .select('platform_credit_balance')
    .eq('id', merchantId)
    .maybeSingle();
  return roundMoney(Number((data as { platform_credit_balance?: number } | null)?.platform_credit_balance ?? 0));
}

export function estimatePlatformFeeAmount(gmv: number, tier: MerchantTier | string | null | undefined) {
  return roundMoney(roundMoney(gmv) * getPlatformFeeRate(tier));
}

/** 預估線下訂單將扣之平台費；卡款回傳 0（不走預付） */
export async function estimateOfflinePlatformFeeForOrder(orderId: string): Promise<{
  fee: number;
  paymentMethod: string;
  isOffline: boolean;
  merchantId: string | null;
  gmv: number;
}> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id, total, payment_method')
    .eq('id', orderId)
    .maybeSingle();

  const row = order as {
    merchant_id: string | null;
    total: number;
    payment_method: string | null;
  } | null;

  if (!row?.merchant_id) {
    return { fee: 0, paymentMethod: 'card', isOffline: false, merchantId: null, gmv: 0 };
  }

  const method = (row.payment_method || 'card') as MerchantPaymentMethod;
  const isOffline = isManualPaymentMethod(method);
  const gmv = roundMoney(Number(row.total));

  if (!isOffline) {
    return { fee: 0, paymentMethod: method, isOffline: false, merchantId: row.merchant_id, gmv };
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('tier')
    .eq('id', row.merchant_id)
    .maybeSingle();

  const rate = await getEffectivePlatformFeeRate(
    (merchant as { tier?: string } | null)?.tier
  );
  const fee = roundMoney(gmv * rate);

  return { fee, paymentMethod: method, isOffline: true, merchantId: row.merchant_id, gmv };
}

export async function assertMerchantCanCoverOfflineFee(
  merchantId: string,
  fee: number
): Promise<{ ok: true; balance: number } | { ok: false; balance: number; error: string }> {
  const balance = await getMerchantPlatformCreditBalance(merchantId);
  if (fee <= 0) return { ok: true, balance };
  if (balance + 1e-9 < fee) {
    return {
      ok: false,
      balance,
      error: `平台服務費預付餘額不足（餘額 HK$${balance.toFixed(2)}，本單約需 HK$${fee.toFixed(2)}）。請先至「平台服務費」儲值後再確認收款。`,
    };
  }
  return { ok: true, balance };
}

export async function deductPlatformCreditForOrder(
  merchantId: string,
  orderId: string,
  feeAmount: number
): Promise<{ ok: boolean; skipped?: boolean; balance?: number; error?: string }> {
  const fee = roundMoney(feeAmount);
  if (fee <= 0) return { ok: true, skipped: true };

  const supabase = createAdminClient();
  const { data, error } = await (supabase as any).rpc('deduct_merchant_platform_credit', {
    p_merchant_id: merchantId,
    p_amount: fee,
    p_order_id: orderId,
    p_note: `訂單平台服務費 #${orderId.slice(0, 8)}`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data == null) {
    return {
      ok: false,
      error: '平台服務費預付餘額不足，無法扣款',
    };
  }

  return { ok: true, balance: Number(data) };
}

export async function refundPlatformCreditForOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: deduct } = await (supabase as any)
    .from('merchant_platform_credit_ledger')
    .select('merchant_id, amount')
    .eq('order_id', orderId)
    .eq('entry_type', 'deduct_order')
    .maybeSingle();

  if (!deduct) return;

  const amount = Math.abs(Number((deduct as { amount: number }).amount));
  if (amount <= 0) return;

  await (supabase as any).rpc('credit_merchant_platform_balance', {
    p_merchant_id: (deduct as { merchant_id: string }).merchant_id,
    p_amount: amount,
    p_entry_type: 'refund_order',
    p_note: `退款退回平台服務費 #${orderId.slice(0, 8)}`,
    p_order_id: orderId,
  });
}

export async function adminAdjustPlatformCredit(input: {
  merchantId: string;
  amount: number;
  note?: string;
  adminId: string;
  entryType?: 'topup' | 'adjust';
}): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const amount = roundMoney(input.amount);
  if (amount === 0) return { ok: false, error: '金額不可為 0' };

  const entryType = input.entryType ?? (amount > 0 ? 'topup' : 'adjust');
  const supabase = createAdminClient();

  if (amount < 0) {
    // 調減：用扣款邏輯確保不負數
    const balance = await getMerchantPlatformCreditBalance(input.merchantId);
    if (balance < Math.abs(amount)) {
      return { ok: false, error: `餘額不足，目前 HK$${balance.toFixed(2)}` };
    }
    const { data: after, error } = await (supabase as any)
      .from('merchants')
      .update({
        platform_credit_balance: roundMoney(balance + amount),
      })
      .eq('id', input.merchantId)
      .select('platform_credit_balance')
      .single();
    if (error) return { ok: false, error: error.message };
    const balanceAfter = Number(
      (after as { platform_credit_balance: number }).platform_credit_balance
    );
    await (supabase as any).from('merchant_platform_credit_ledger').insert({
      merchant_id: input.merchantId,
      entry_type: 'adjust',
      amount,
      balance_after: balanceAfter,
      note: input.note || '管理員調減',
      created_by: input.adminId,
    });
    return { ok: true, balance: balanceAfter };
  }

  const { data, error } = await (supabase as any).rpc('credit_merchant_platform_balance', {
    p_merchant_id: input.merchantId,
    p_amount: amount,
    p_entry_type: entryType,
    p_note: input.note || (entryType === 'topup' ? '管理員確認儲值' : '管理員調帳'),
    p_created_by: input.adminId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, balance: Number(data) };
}

export async function createTopupRequest(input: {
  merchantId: string;
  amount: number;
  merchantNote?: string;
}): Promise<{ ok: boolean; request?: CreditTopupRequest; error?: string }> {
  const amount = roundMoney(input.amount);
  if (amount < 10) return { ok: false, error: '單次儲值至少 HK$10' };
  if (amount > 100000) return { ok: false, error: '單次儲值不可超過 HK$100,000' };

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('merchant_credit_topup_requests')
    .insert({
      merchant_id: input.merchantId,
      amount,
      merchant_note: input.merchantNote?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, request: data as CreditTopupRequest };
}

export async function listTopupRequestsForMerchant(merchantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('merchant_credit_topup_requests')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data || []) as CreditTopupRequest[];
}

export async function listCreditLedgerForMerchant(merchantId: string, limit = 40) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('merchant_platform_credit_ledger')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as CreditLedgerEntry[];
}

export async function listPendingTopupRequestsAdmin() {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('merchant_credit_topup_requests')
    .select('*, merchants(id, name, slug, platform_credit_balance)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  return data || [];
}

export async function listMerchantsCreditAdmin() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('merchants')
    .select('id, name, slug, status, tier, platform_credit_balance')
    .eq('status', 'active')
    .order('name', { ascending: true });
  return (data || []) as Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    tier: string;
    platform_credit_balance: number;
  }>;
}

export async function reviewTopupRequest(input: {
  requestId: string;
  approve: boolean;
  adminId: string;
  adminNote?: string;
}): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const supabase = createAdminClient();
  const { data: req } = await (supabase as any)
    .from('merchant_credit_topup_requests')
    .select('*')
    .eq('id', input.requestId)
    .maybeSingle();

  const row = req as CreditTopupRequest | null;
  if (!row) return { ok: false, error: '申請不存在' };
  if (row.status !== 'pending') return { ok: false, error: '此申請已處理' };

  if (!input.approve) {
    const { error } = await (supabase as any)
      .from('merchant_credit_topup_requests')
      .update({
        status: 'rejected',
        admin_note: input.adminNote?.trim() || null,
        reviewed_by: input.adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', input.requestId)
      .eq('status', 'pending');
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { data: balance, error: creditError } = await (supabase as any).rpc(
    'credit_merchant_platform_balance',
    {
      p_merchant_id: row.merchant_id,
      p_amount: Number(row.amount),
      p_entry_type: 'topup',
      p_note: input.adminNote?.trim() || `核准儲值申請 #${row.id.slice(0, 8)}`,
      p_topup_request_id: row.id,
      p_created_by: input.adminId,
    }
  );

  if (creditError) return { ok: false, error: creditError.message };

  const { error } = await (supabase as any)
    .from('merchant_credit_topup_requests')
    .update({
      status: 'approved',
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: input.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending');

  if (error) return { ok: false, error: error.message };
  return { ok: true, balance: Number(balance) };
}
