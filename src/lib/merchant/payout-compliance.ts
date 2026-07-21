import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/finance/config';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';

export const PAYOUT_REMIND_DAYS_KEY = 'payout_overdue_remind_days';
export const PAYOUT_BLOCK_DAYS_KEY = 'payout_overdue_block_days';

export const DEFAULT_PAYOUT_REMIND_DAYS = 3;
export const DEFAULT_PAYOUT_BLOCK_DAYS = 7;

export type PayoutOverdueThresholds = {
  remindDays: number;
  blockDays: number;
};

export type OverduePayableItem = {
  kind: 'promoter' | 'courier';
  earningId: string;
  orderId: string;
  amount: number;
  dueFrom: string;
  overdueDays: number;
  payeeName: string;
};

export type MerchantPayoutCompliance = {
  remindDays: number;
  blockDays: number;
  overdueItems: OverduePayableItem[];
  maxOverdueDays: number;
  pendingAmount: number;
  level: 'ok' | 'remind' | 'block';
  deliveryBlocked: boolean;
  deliveryBlockReason: string | null;
  message: string | null;
};

function parseDays(raw: unknown, fallback: number): number {
  const num =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : Number(raw);
  if (!Number.isFinite(num) || num < 1 || num > 90) return fallback;
  return Math.floor(num);
}

export function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  const ms = to.getTime() - from;
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export async function getPayoutOverdueThresholds(): Promise<PayoutOverdueThresholds> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_settings')
    .select('key, value')
    .in('key', [PAYOUT_REMIND_DAYS_KEY, PAYOUT_BLOCK_DAYS_KEY]);

  const map = new Map(
    ((data || []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value])
  );

  return {
    remindDays: parseDays(map.get(PAYOUT_REMIND_DAYS_KEY), DEFAULT_PAYOUT_REMIND_DAYS),
    blockDays: parseDays(map.get(PAYOUT_BLOCK_DAYS_KEY), DEFAULT_PAYOUT_BLOCK_DAYS),
  };
}

export async function setPayoutOverdueThresholds(
  input: PayoutOverdueThresholds,
  adminId: string
): Promise<{ error: string | null; thresholds: PayoutOverdueThresholds }> {
  if (input.remindDays < 1 || input.blockDays < 1 || input.remindDays > input.blockDays) {
    return {
      error: '提醒天數須 ≥ 1，且不得大於限制天數',
      thresholds: input,
    };
  }

  const supabase = createAdminClient();
  const rows = [
    { key: PAYOUT_REMIND_DAYS_KEY, value: input.remindDays },
    { key: PAYOUT_BLOCK_DAYS_KEY, value: input.blockDays },
  ];

  for (const row of rows) {
    const { error } = await (supabase as any).from('platform_settings').upsert({
      key: row.key,
      value: row.value,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });
    if (error) {
      return { error: error.message, thresholds: input };
    }
  }

  return { error: null, thresholds: input };
}

async function listMerchantOverdueItems(merchantId: string): Promise<OverduePayableItem[]> {
  const supabase = createAdminClient();
  const items: OverduePayableItem[] = [];

  const { data: promoterRows } = await (supabase as any)
    .from('promoter_earnings')
    .select('id, order_id, net_amount, created_at, merchant_paid_at, status, promoter_id')
    .eq('merchant_id', merchantId)
    .is('merchant_paid_at', null)
    .in('status', ['pending', 'confirmed']);

  const promoters = (promoterRows || []) as {
    id: string;
    order_id: string;
    net_amount: number;
    created_at: string;
    promoter_id: string;
  }[];

  const promoterIds = [...new Set(promoters.map((p) => p.promoter_id))];
  const { data: names } = promoterIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', promoterIds)
    : { data: [] };
  const nameMap = new Map(
    ((names || []) as { id: string; display_name: string | null }[]).map((n) => [
      n.id,
      n.display_name?.trim() || '分享員',
    ])
  );

  for (const row of promoters) {
    items.push({
      kind: 'promoter',
      earningId: row.id,
      orderId: row.order_id,
      amount: roundMoney(Number(row.net_amount)),
      dueFrom: row.created_at,
      overdueDays: daysBetween(row.created_at),
      payeeName: nameMap.get(row.promoter_id) || '分享員',
    });
  }

  const { data: orderRows } = await supabase
    .from('orders')
    .select('id')
    .eq('merchant_id', merchantId)
    .limit(500);
  const orderIds = ((orderRows || []) as { id: string }[]).map((o) => o.id);

  if (orderIds.length > 0) {
    const { data: courierRows } = await (supabase as any)
      .from('courier_delivery_earnings')
      .select(
        'id, order_id, amount, earned_at, merchant_paid_at, settlement_status, courier_id'
      )
      .in('order_id', orderIds)
      .is('merchant_paid_at', null)
      .neq('settlement_status', 'reversed');

    const couriers = (courierRows || []) as {
      id: string;
      order_id: string;
      amount: number;
      earned_at: string;
      courier_id: string;
    }[];

    const courierIds = [...new Set(couriers.map((c) => c.courier_id))];
    const { data: cNames } = courierIds.length
      ? await supabase.from('profiles').select('id, display_name').in('id', courierIds)
      : { data: [] };
    const cNameMap = new Map(
      ((cNames || []) as { id: string; display_name: string | null }[]).map((n) => [
        n.id,
        n.display_name?.trim() || '配送員',
      ])
    );

    for (const row of couriers) {
      items.push({
        kind: 'courier',
        earningId: row.id,
        orderId: row.order_id,
        amount: roundMoney(Number(row.amount)),
        dueFrom: row.earned_at,
        overdueDays: daysBetween(row.earned_at),
        payeeName: cNameMap.get(row.courier_id) || '配送員',
      });
    }
  }

  return items.sort((a, b) => b.overdueDays - a.overdueDays);
}

/** 依逾期天數更新商家配送限制（懶更新） */
export async function refreshMerchantPayoutRestriction(
  merchantId: string
): Promise<MerchantPayoutCompliance> {
  const supabase = createAdminClient();
  const thresholds = await getPayoutOverdueThresholds();
  const overdueItems = await listMerchantOverdueItems(merchantId);
  const blocking = overdueItems.filter((i) => i.overdueDays >= thresholds.blockDays);
  const reminding = overdueItems.filter((i) => i.overdueDays >= thresholds.remindDays);
  const maxOverdueDays = overdueItems.reduce((m, i) => Math.max(m, i.overdueDays), 0);
  const pendingAmount = roundMoney(overdueItems.reduce((s, i) => s + i.amount, 0));

  const { data: merchant } = await supabase
    .from('merchants')
    .select('payout_delivery_blocked_at, payout_delivery_block_reason')
    .eq('id', merchantId)
    .maybeSingle();

  const row = merchant as {
    payout_delivery_blocked_at?: string | null;
    payout_delivery_block_reason?: string | null;
  } | null;

  let deliveryBlocked = Boolean(row?.payout_delivery_blocked_at);
  let deliveryBlockReason = row?.payout_delivery_block_reason ?? null;
  const manualUnblock = deliveryBlockReason?.startsWith('[手動解除]');
  const manualBlock =
    Boolean(deliveryBlockReason?.startsWith('[手動]')) && !manualUnblock;

  if (blocking.length > 0) {
    if (manualUnblock) {
      // 管理員暫時解除：刷新時不自動再鎖，直到逾期降至門檻下再清除覆寫
      deliveryBlocked = false;
    } else if (!manualBlock || !deliveryBlocked) {
      const reason = `有 ${blocking.length} 筆應付分享員／配送員已逾期 ≥ ${thresholds.blockDays} 天，請先至「應付佣金／工資」完成付款並標記已付。`;
      if (!deliveryBlocked || deliveryBlockReason !== reason) {
        await (supabase as any)
          .from('merchants')
          .update({
            payout_delivery_blocked_at:
              row?.payout_delivery_blocked_at || new Date().toISOString(),
            payout_delivery_block_reason: reason,
          })
          .eq('id', merchantId);
      }
      deliveryBlocked = true;
      deliveryBlockReason = reason;
    }
  } else if (deliveryBlocked && !manualBlock) {
    // 已無達封鎖門檻的逾期：自動解除（保留管理員手動封鎖）
    await (supabase as any)
      .from('merchants')
      .update({
        payout_delivery_blocked_at: null,
        payout_delivery_block_reason: null,
      })
      .eq('id', merchantId);
    deliveryBlocked = false;
    deliveryBlockReason = null;
  } else if (manualUnblock) {
    // 逾期已低於限制門檻，清除手動解除覆寫
    await (supabase as any)
      .from('merchants')
      .update({
        payout_delivery_blocked_at: null,
        payout_delivery_block_reason: null,
      })
      .eq('id', merchantId);
    deliveryBlockReason = null;
  }

  let level: MerchantPayoutCompliance['level'] = 'ok';
  let message: string | null = null;
  if (deliveryBlocked) {
    level = 'block';
    message =
      deliveryBlockReason ||
      `應付佣金／工資已逾期超過 ${thresholds.blockDays} 天，已暫停新建配送任務。`;
  } else if (manualUnblock && blocking.length > 0) {
    level = 'remind';
    message = `管理員已暫時解除配送限制，但仍有 ${blocking.length} 筆逾期 ≥ ${thresholds.blockDays} 天（合共 HK$${pendingAmount.toFixed(2)}）。請盡快完成付款並標記已付。`;
  } else if (reminding.length > 0) {
    level = 'remind';
    message = `有 ${reminding.length} 筆應付已逾期 ≥ ${thresholds.remindDays} 天（合共 HK$${pendingAmount.toFixed(2)}），請盡快付款並標記已付。`;
  }

  return {
    remindDays: thresholds.remindDays,
    blockDays: thresholds.blockDays,
    overdueItems,
    maxOverdueDays,
    pendingAmount,
    level,
    deliveryBlocked,
    deliveryBlockReason,
    message,
  };
}

export async function assertMerchantCanCreateDelivery(
  merchantId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 僅商家直付模式才強制限制
  if (!(await isMerchantDirectPayout())) {
    return { ok: true };
  }
  const compliance = await refreshMerchantPayoutRestriction(merchantId);
  if (compliance.deliveryBlocked) {
    return {
      ok: false,
      error:
        compliance.deliveryBlockReason ||
        '因逾期未付分享員／配送員工資，暫不可建立配送任務。請先完成付款並標記已付。',
    };
  }
  return { ok: true };
}

export async function setMerchantDeliveryPayoutBlock(input: {
  merchantId: string;
  blocked: boolean;
  reason?: string;
  adminId: string;
}): Promise<{ error: string | null }> {
  const supabase = createAdminClient();
  // 解除時寫入 [手動解除]，避免 refresh 因仍逾期而立刻自動再鎖
  const patch = input.blocked
    ? {
        payout_delivery_blocked_at: new Date().toISOString(),
        payout_delivery_block_reason: `[手動] ${input.reason?.trim() || '管理員因逾期未付限制配送'}`,
      }
    : {
        payout_delivery_blocked_at: null,
        payout_delivery_block_reason: `[手動解除] ${input.reason?.trim() || '管理員暫時解除配送限制'}`,
      };

  const { error } = await (supabase as any)
    .from('merchants')
    .update(patch)
    .eq('id', input.merchantId);

  return { error: error?.message ?? null };
}

export type PayoutUnpaidReportRow = {
  id: string;
  reporter_role: 'promoter' | 'courier';
  reporter_id: string;
  earning_type: 'promoter' | 'courier';
  earning_id: string;
  merchant_id: string;
  order_id: string | null;
  amount: number;
  note: string | null;
  status: string;
  created_at: string;
  admin_note?: string | null;
};

export type AdminOverdueMerchantRow = {
  merchantId: string;
  merchantName: string;
  maxOverdueDays: number;
  pendingAmount: number;
  overdueCount: number;
  deliveryBlocked: boolean;
  /** 管理員暫時解除覆寫中（仍可能有逾期） */
  manualUnblock: boolean;
  openReports: number;
};

async function collectCandidateMerchantIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const ids = new Set<string>();

  const { data: blocked } = await (supabase as any)
    .from('merchants')
    .select('id')
    .not('payout_delivery_blocked_at', 'is', null);
  for (const row of (blocked || []) as { id: string }[]) ids.add(row.id);

  const { data: promoters } = await (supabase as any)
    .from('promoter_earnings')
    .select('merchant_id')
    .is('merchant_paid_at', null)
    .in('status', ['pending', 'confirmed'])
    .limit(500);
  for (const row of (promoters || []) as { merchant_id: string }[]) {
    ids.add(row.merchant_id);
  }

  const { data: courierRows } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('order_id')
    .is('merchant_paid_at', null)
    .neq('settlement_status', 'reversed')
    .limit(500);
  const orderIds = [
    ...new Set(((courierRows || []) as { order_id: string }[]).map((r) => r.order_id)),
  ];
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('merchant_id')
      .in('id', orderIds);
    for (const row of (orders || []) as { merchant_id: string }[]) {
      ids.add(row.merchant_id);
    }
  }

  const { data: reportMerchants } = await (supabase as any)
    .from('payout_unpaid_reports')
    .select('merchant_id')
    .eq('status', 'open')
    .limit(200);
  for (const row of (reportMerchants || []) as { merchant_id: string }[]) {
    ids.add(row.merchant_id);
  }

  return [...ids];
}

export async function listAdminOverdueMerchants(): Promise<{
  thresholds: PayoutOverdueThresholds;
  merchants: AdminOverdueMerchantRow[];
  openReports: PayoutUnpaidReportRow[];
}> {
  const thresholds = await getPayoutOverdueThresholds();
  const supabase = createAdminClient();
  const candidateIds = await collectCandidateMerchantIds();

  const rows: AdminOverdueMerchantRow[] = [];
  if (candidateIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, name')
      .in('id', candidateIds);

    const list = (merchants || []) as { id: string; name: string }[];
    const nameMap = new Map(list.map((m) => [m.id, m.name]));

    for (const merchantId of candidateIds) {
      const compliance = await refreshMerchantPayoutRestriction(merchantId);
      const overdue = compliance.overdueItems.filter(
        (i) => i.overdueDays >= thresholds.remindDays
      );
      if (overdue.length === 0 && !compliance.deliveryBlocked) continue;

      const { count } = await (supabase as any)
        .from('payout_unpaid_reports')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('status', 'open');

      rows.push({
        merchantId,
        merchantName: nameMap.get(merchantId) || merchantId.slice(0, 8),
        maxOverdueDays: compliance.maxOverdueDays,
        pendingAmount: compliance.pendingAmount,
        overdueCount: overdue.length,
        deliveryBlocked: compliance.deliveryBlocked,
        manualUnblock: Boolean(
          compliance.deliveryBlockReason?.startsWith('[手動解除]')
        ),
        openReports: count ?? 0,
      });
    }
  }

  rows.sort((a, b) => b.maxOverdueDays - a.maxOverdueDays || b.pendingAmount - a.pendingAmount);

  const { data: reports } = await (supabase as any)
    .from('payout_unpaid_reports')
    .select(
      'id, reporter_role, reporter_id, earning_type, earning_id, merchant_id, order_id, amount, note, status, created_at, admin_note'
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    thresholds,
    merchants: rows,
    openReports: ((reports || []) as PayoutUnpaidReportRow[]).map((r) => ({
      ...r,
      amount: roundMoney(Number(r.amount)),
    })),
  };
}

export async function createUnpaidReport(input: {
  reporterRole: 'promoter' | 'courier';
  reporterId: string;
  earningType: 'promoter' | 'courier';
  earningId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  if (input.earningType === 'promoter') {
    const { data } = await (supabase as any)
      .from('promoter_earnings')
      .select('id, promoter_id, merchant_id, order_id, net_amount, merchant_paid_at, status')
      .eq('id', input.earningId)
      .maybeSingle();
    const row = data as {
      promoter_id: string;
      merchant_id: string;
      order_id: string;
      net_amount: number;
      merchant_paid_at: string | null;
      status: string;
    } | null;
    if (!row || row.promoter_id !== input.reporterId) {
      return { ok: false, error: '找不到此筆佣金' };
    }
    if (row.merchant_paid_at || row.status === 'paid') {
      return { ok: false, error: '商家已標記付款，無需回報' };
    }
    return insertReport({
      reporterRole: input.reporterRole,
      reporterId: input.reporterId,
      earningType: 'promoter',
      earningId: input.earningId,
      merchantId: row.merchant_id,
      orderId: row.order_id,
      amount: Number(row.net_amount),
      note: input.note,
    });
  }

  const { data } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select(
      'id, courier_id, order_id, amount, merchant_paid_at, settlement_status'
    )
    .eq('id', input.earningId)
    .maybeSingle();
  const row = data as {
    courier_id: string;
    order_id: string;
    amount: number;
    merchant_paid_at: string | null;
    settlement_status: string;
  } | null;
  if (!row || row.courier_id !== input.reporterId) {
    return { ok: false, error: '找不到此筆工資' };
  }
  if (row.merchant_paid_at) {
    return { ok: false, error: '商家已標記付款，無需回報' };
  }
  if (row.settlement_status === 'reversed') {
    return { ok: false, error: '此筆已撤銷' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('merchant_id')
    .eq('id', row.order_id)
    .maybeSingle();
  const merchantId = (order as { merchant_id: string } | null)?.merchant_id;
  if (!merchantId) return { ok: false, error: '訂單不存在' };

  return insertReport({
    reporterRole: input.reporterRole,
    reporterId: input.reporterId,
    earningType: 'courier',
    earningId: input.earningId,
    merchantId,
    orderId: row.order_id,
    amount: Number(row.amount),
    note: input.note,
  });
}

async function insertReport(input: {
  reporterRole: 'promoter' | 'courier';
  reporterId: string;
  earningType: 'promoter' | 'courier';
  earningId: string;
  merchantId: string;
  orderId: string;
  amount: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await (supabase as any).from('payout_unpaid_reports').insert({
    reporter_role: input.reporterRole,
    reporter_id: input.reporterId,
    earning_type: input.earningType,
    earning_id: input.earningId,
    merchant_id: input.merchantId,
    order_id: input.orderId,
    amount: roundMoney(input.amount),
    note: input.note?.trim() || null,
    status: 'open',
  });

  if (error) {
    if (error.message?.includes('payout_unpaid_reports')) {
      return { ok: false, error: '請執行 supabase/migrate-v55-payout-overdue.sql' };
    }
    if (error.code === '23505') {
      return { ok: false, error: '此筆已有處理中的未付回報' };
    }
    return { ok: false, error: error.message };
  }

  // 有正式投訴時，立即刷新限制
  await refreshMerchantPayoutRestriction(input.merchantId);
  return { ok: true };
}

export async function resolveUnpaidReport(input: {
  reportId: string;
  adminId: string;
  status: 'resolved' | 'dismissed';
  adminNote?: string;
}): Promise<{ error: string | null }> {
  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('payout_unpaid_reports')
    .update({
      status: input.status,
      resolved_at: new Date().toISOString(),
      resolved_by: input.adminId,
      admin_note: input.adminNote?.trim() || null,
    })
    .eq('id', input.reportId)
    .eq('status', 'open');

  return { error: error?.message ?? null };
}
