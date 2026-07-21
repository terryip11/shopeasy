import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import type {
  MerchantPayablesSummary,
  PayableCourierItem,
  PayablePromoterItem,
} from '@/lib/merchant/payables-types';
import { refreshMerchantPayoutRestriction } from '@/lib/merchant/payout-compliance';

export type {
  MerchantPayablesSummary,
  PayableCourierItem,
  PayablePromoterItem,
} from '@/lib/merchant/payables-types';

export async function getMerchantPayables(merchantId: string): Promise<MerchantPayablesSummary> {
  const supabase = createAdminClient();

  const { data: promoterRows } = await (supabase as any)
    .from('promoter_earnings')
    .select(
      'id, order_id, net_amount, commission_rate, status, created_at, merchant_paid_at, merchant_paid_note, promoter_id'
    )
    .eq('merchant_id', merchantId)
    .in('status', ['pending', 'confirmed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(100);

  const promoterList = (promoterRows || []) as {
    id: string;
    order_id: string;
    net_amount: number;
    commission_rate: number;
    status: string;
    created_at: string;
    merchant_paid_at: string | null;
    merchant_paid_note: string | null;
    promoter_id: string;
  }[];

  const promoterIds = [...new Set(promoterList.map((r) => r.promoter_id))];

  const [promoterProfilesRes, promoterNamesRes] = await Promise.all([
    promoterIds.length
      ? (supabase as any)
          .from('promoter_profiles')
          .select('user_id, payout_account_holder, payout_fps_id')
          .in('user_id', promoterIds)
      : Promise.resolve({ data: [] }),
    promoterIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', promoterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const payoutByPromoter = new Map(
    ((promoterProfilesRes.data || []) as {
      user_id: string;
      payout_account_holder: string | null;
      payout_fps_id: string | null;
    }[]).map((p) => [p.user_id, p])
  );
  const nameById = new Map(
    ((promoterNamesRes.data || []) as { id: string; display_name: string | null }[]).map((p) => [
      p.id,
      p.display_name?.trim() || '分享員',
    ])
  );

  const promoters: PayablePromoterItem[] = promoterList.map((r) => {
    const payout = payoutByPromoter.get(r.promoter_id);
    return {
      id: r.id,
      orderId: r.order_id,
      orderShort: r.order_id.slice(0, 8),
      amount: roundMoney(Number(r.net_amount)),
      commissionRate: Number(r.commission_rate),
      status: r.status,
      createdAt: r.created_at,
      paidAt: r.merchant_paid_at,
      paidNote: r.merchant_paid_note,
      promoter: {
        id: r.promoter_id,
        displayName: nameById.get(r.promoter_id) || '分享員',
        accountHolder: payout?.payout_account_holder?.trim() || '',
        fpsId: payout?.payout_fps_id?.trim() || '',
      },
    };
  });

  const { data: orderRows } = await supabase
    .from('orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .limit(500);

  const orderIds = ((orderRows || []) as { id: string }[]).map((o) => o.id);

  let courierList: {
    id: string;
    order_id: string;
    delivery_job_id: string;
    amount: number;
    gross_amount: number | null;
    job_type: string;
    earned_at: string;
    settlement_status: string;
    merchant_paid_at: string | null;
    merchant_paid_note: string | null;
    courier_id: string;
  }[] = [];

  if (orderIds.length > 0) {
    const { data: courierRows } = await (supabase as any)
      .from('courier_delivery_earnings')
      .select(
        'id, order_id, delivery_job_id, amount, gross_amount, job_type, earned_at, settlement_status, merchant_paid_at, merchant_paid_note, courier_id'
      )
      .in('order_id', orderIds)
      .neq('settlement_status', 'reversed')
      .order('earned_at', { ascending: false })
      .limit(100);
    courierList = (courierRows || []) as typeof courierList;
  }

  const courierIds = [...new Set(courierList.map((r) => r.courier_id))];

  const [courierProfilesRes, courierNamesRes] = await Promise.all([
    courierIds.length
      ? (supabase as any)
          .from('courier_profiles')
          .select('user_id, phone, payout_account_holder, payout_fps_id')
          .in('user_id', courierIds)
      : Promise.resolve({ data: [] }),
    courierIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', courierIds)
      : Promise.resolve({ data: [] }),
  ]);

  const courierProfileById = new Map(
    ((courierProfilesRes.data || []) as {
      user_id: string;
      phone: string | null;
      payout_account_holder: string | null;
      payout_fps_id: string | null;
    }[]).map((p) => [p.user_id, p])
  );
  const courierNameById = new Map(
    ((courierNamesRes.data || []) as { id: string; display_name: string | null }[]).map((p) => [
      p.id,
      p.display_name?.trim() || '配送員',
    ])
  );

  const couriers: PayableCourierItem[] = courierList.map((r) => {
    const profile = courierProfileById.get(r.courier_id);
    return {
      id: r.id,
      orderId: r.order_id,
      orderShort: r.order_id.slice(0, 8),
      deliveryJobId: r.delivery_job_id,
      amount: roundMoney(Number(r.amount)),
      grossAmount: r.gross_amount != null ? roundMoney(Number(r.gross_amount)) : null,
      jobType: r.job_type,
      earnedAt: r.earned_at,
      settlementStatus: r.settlement_status,
      paidAt: r.merchant_paid_at,
      paidNote: r.merchant_paid_note,
      courier: {
        id: r.courier_id,
        displayName: courierNameById.get(r.courier_id) || '配送員',
        phone: profile?.phone ?? null,
        accountHolder: profile?.payout_account_holder?.trim() || '',
        fpsId: profile?.payout_fps_id?.trim() || '',
      },
    };
  });

  const promoterPending = promoters.filter((p) => !p.paidAt && p.status !== 'paid');
  const courierPending = couriers.filter((c) => !c.paidAt);

  return {
    promoterPendingTotal: roundMoney(promoterPending.reduce((s, p) => s + p.amount, 0)),
    promoterPendingCount: promoterPending.length,
    courierPendingTotal: roundMoney(courierPending.reduce((s, c) => s + c.amount, 0)),
    courierPendingCount: courierPending.length,
    promoters,
    couriers,
  };
}

export async function markPromoterEarningPaid(input: {
  merchantId: string;
  earningId: string;
  merchantUserId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: row, error } = await (supabase as any)
    .from('promoter_earnings')
    .select('id, merchant_id, merchant_paid_at, status')
    .eq('id', input.earningId)
    .eq('merchant_id', input.merchantId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: '找不到此筆分享佣金' };
  if ((row as { merchant_paid_at: string | null }).merchant_paid_at) {
    return { ok: false, error: '此筆已標記為已付' };
  }
  if ((row as { status: string }).status === 'reversed') {
    return { ok: false, error: '已撤銷的佣金無法標記已付' };
  }

  const { error: updateError } = await (supabase as any)
    .from('promoter_earnings')
    .update({
      merchant_paid_at: new Date().toISOString(),
      merchant_paid_by: input.merchantUserId,
      merchant_paid_note: input.note?.trim() || null,
      status: 'paid',
    })
    .eq('id', input.earningId)
    .eq('merchant_id', input.merchantId);

  if (updateError) {
    if (updateError.message?.includes('merchant_paid_at')) {
      return { ok: false, error: '請執行 supabase/migrate-v54-merchant-direct-payout.sql' };
    }
    return { ok: false, error: updateError.message };
  }

  await refreshMerchantPayoutRestriction(input.merchantId);
  return { ok: true };
}

export async function markCourierEarningPaid(input: {
  merchantId: string;
  earningId: string;
  merchantUserId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: earning, error } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('id, order_id, merchant_paid_at, settlement_status')
    .eq('id', input.earningId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!earning) return { ok: false, error: '找不到此筆配送工資' };

  const row = earning as {
    id: string;
    order_id: string;
    merchant_paid_at: string | null;
    settlement_status: string;
  };

  if (row.merchant_paid_at) return { ok: false, error: '此筆已標記為已付' };
  if (row.settlement_status === 'reversed') {
    return { ok: false, error: '已撤銷的工資無法標記已付' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id')
    .eq('id', row.order_id)
    .eq('merchant_id', input.merchantId)
    .maybeSingle();

  if (!order) return { ok: false, error: '無權操作此筆配送工資' };

  const { error: updateError } = await (supabase as any)
    .from('courier_delivery_earnings')
    .update({
      merchant_paid_at: new Date().toISOString(),
      merchant_paid_by: input.merchantUserId,
      merchant_paid_note: input.note?.trim() || null,
      settlement_status: 'settled',
    })
    .eq('id', input.earningId);

  if (updateError) {
    if (updateError.message?.includes('merchant_paid_at')) {
      return { ok: false, error: '請執行 supabase/migrate-v54-merchant-direct-payout.sql' };
    }
    return { ok: false, error: updateError.message };
  }

  await refreshMerchantPayoutRestriction(input.merchantId);
  return { ok: true };
}
