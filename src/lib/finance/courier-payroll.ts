import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { periodEndFromStart, roundMoney } from '@/lib/finance/config';

export type CourierPayrollPreview = {
  periodStart: string;
  periodEnd: string;
  pendingAmount: number;
  pendingCount: number;
  courierCount: number;
  byCourier: Array<{
    courier_id: string;
    display_name: string;
    amount: number;
    count: number;
  }>;
  existingRun: {
    id: string;
    status: string;
    total_amount: number;
    settled_at: string | null;
  } | null;
};

export type CourierPayrollStats = {
  pendingTotal: number;
  pendingCount: number;
  lastSettledMonth: string | null;
  lastSettledAmount: number;
};

function monthBounds(periodStart: string) {
  const start = `${periodStart}T00:00:00.000Z`;
  const endDate = periodEndFromStart(periodStart);
  const end = `${endDate}T23:59:59.999Z`;
  return { start, end };
}

export async function getCourierPayrollPreview(periodStart: string): Promise<CourierPayrollPreview> {
  const supabase = createAdminClient();
  const { start, end } = monthBounds(periodStart);
  const periodEnd = periodEndFromStart(periodStart);

  const { data: earnings } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('courier_id, amount')
    .eq('settlement_status', 'pending')
    .gte('earned_at', start)
    .lte('earned_at', end);

  const rows = (earnings || []) as { courier_id: string; amount: number }[];
  const byCourierMap = new Map<string, { amount: number; count: number }>();

  for (const r of rows) {
    const cur = byCourierMap.get(r.courier_id) || { amount: 0, count: 0 };
    cur.amount += Number(r.amount);
    cur.count += 1;
    byCourierMap.set(r.courier_id, cur);
  }

  const courierIds = [...byCourierMap.keys()];
  const names: Record<string, string> = {};
  if (courierIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', courierIds);
    for (const p of profiles || []) {
      const row = p as { id: string; display_name: string | null };
      names[row.id] = row.display_name?.trim() || '配送員';
    }
  }

  const byCourier = courierIds.map((id) => {
    const v = byCourierMap.get(id)!;
    return {
      courier_id: id,
      display_name: names[id] || '配送員',
      amount: roundMoney(v.amount),
      count: v.count,
    };
  });

  byCourier.sort((a, b) => b.amount - a.amount);

  const pendingAmount = roundMoney(rows.reduce((s, r) => s + Number(r.amount), 0));

  const { data: existingRun } = await (supabase as any)
    .from('courier_payroll_runs')
    .select('id, status, total_amount, settled_at')
    .eq('period_start', periodStart)
    .maybeSingle();

  return {
    periodStart,
    periodEnd,
    pendingAmount,
    pendingCount: rows.length,
    courierCount: byCourier.length,
    byCourier,
    existingRun: existingRun
      ? {
          id: existingRun.id,
          status: existingRun.status,
          total_amount: Number(existingRun.total_amount),
          settled_at: existingRun.settled_at,
        }
      : null,
  };
}

export async function getCourierPayrollStats(): Promise<CourierPayrollStats> {
  const supabase = createAdminClient();

  const { data: pending } = await (supabase as any)
    .from('courier_delivery_earnings')
    .select('amount')
    .eq('settlement_status', 'pending');

  const pendingRows = (pending || []) as { amount: number }[];

  const { data: lastRun } = await (supabase as any)
    .from('courier_payroll_runs')
    .select('period_start, total_amount')
    .eq('status', 'settled')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    pendingTotal: roundMoney(pendingRows.reduce((s, r) => s + Number(r.amount), 0)),
    pendingCount: pendingRows.length,
    lastSettledMonth: lastRun?.period_start ?? null,
    lastSettledAmount: lastRun ? Number(lastRun.total_amount) : 0,
  };
}

/** 結算指定月份配送員工資 */
export async function settleCourierPayroll(
  periodStart: string,
  settledBy: string,
  notes?: string | null
): Promise<{ ok: boolean; error?: string; runId?: string }> {
  const preview = await getCourierPayrollPreview(periodStart);
  if (preview.existingRun?.status === 'settled') {
    return { ok: false, error: '該月份已結算' };
  }
  if (preview.pendingCount === 0) {
    return { ok: false, error: '該月份沒有待結算的配送記錄' };
  }

  const supabase = createAdminClient();
  const periodEnd = preview.periodEnd;
  const { start, end } = monthBounds(periodStart);

  let runId = preview.existingRun?.id as string | undefined;

  if (!runId) {
    const { data: run, error: runError } = await (supabase as any)
      .from('courier_payroll_runs')
      .insert({
        period_start: periodStart,
        period_end: periodEnd,
        status: 'draft',
        total_amount: preview.pendingAmount,
        courier_count: preview.courierCount,
        earnings_count: preview.pendingCount,
        notes: notes ?? null,
      })
      .select('id')
      .single();

    if (runError) {
      return { ok: false, error: runError.message };
    }
    runId = run.id;
  }

  for (const line of preview.byCourier) {
    await (supabase as any).from('courier_payroll_lines').upsert(
      {
        payroll_run_id: runId,
        courier_id: line.courier_id,
        amount: line.amount,
        earnings_count: line.count,
      },
      { onConflict: 'payroll_run_id,courier_id' }
    );
  }

  const { error: markError } = await (supabase as any)
    .from('courier_delivery_earnings')
    .update({ settlement_status: 'settled', payroll_run_id: runId })
    .eq('settlement_status', 'pending')
    .gte('earned_at', start)
    .lte('earned_at', end);

  if (markError) {
    return { ok: false, error: markError.message };
  }

  const { error: finalizeError } = await (supabase as any)
    .from('courier_payroll_runs')
    .update({
      status: 'settled',
      total_amount: preview.pendingAmount,
      courier_count: preview.courierCount,
      earnings_count: preview.pendingCount,
      settled_at: new Date().toISOString(),
      settled_by: settledBy,
      notes: notes ?? null,
    })
    .eq('id', runId);

  if (finalizeError) {
    return { ok: false, error: finalizeError.message };
  }

  return { ok: true, runId };
}
