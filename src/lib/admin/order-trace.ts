import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { DELIVERY_JOB_STATUS_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { OrderStatus } from '@/types/database';

export type FlowStepState = 'done' | 'active' | 'pending' | 'warning' | 'skipped' | 'na';

export type OrderFlowStep = {
  key: string;
  label: string;
  state: FlowStepState;
  detail: string | null;
  at: string | null;
};

export type OrderTraceDeliveryJob = {
  id: string;
  order_id: string;
  job_type: string;
  status: string;
  courier_id: string | null;
  courier_name: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  notes: string | null;
};

export type OrderTraceRow = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  merchant_name: string | null;
  buyer_name: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  payment_method: string | null;
  stripe_payment_id: string | null;
  tracking_number: string | null;
  steps: OrderFlowStep[];
  delivery_jobs: OrderTraceDeliveryJob[];
  issues: string[];
  ledger_paid_at: string | null;
  ledger_settlement: string | null;
  courier_earning_amount: number | null;
};

const PAID_STATUSES: OrderStatus[] = ['paid', 'shipped', 'completed', 'refund_requested', 'refunded'];

const JOB_STATUS_RANK: Record<string, number> = {
  delivered: 50,
  picked_up: 40,
  assigned: 30,
  pending: 10,
  failed: 0,
  cancelled: 0,
};

function pickPrimaryTraceJob(jobs: OrderTraceDeliveryJob[]): OrderTraceDeliveryJob | null {
  const active = jobs.filter((j) => j.status !== 'cancelled' && j.status !== 'failed');
  if (active.length === 0) return null;
  return (
    [...active].sort((a, b) => {
      const rankDiff = (JOB_STATUS_RANK[b.status] ?? 0) - (JOB_STATUS_RANK[a.status] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      const courierDiff = (b.courier_id ? 1 : 0) - (a.courier_id ? 1 : 0);
      if (courierDiff !== 0) return courierDiff;
      const timeB = b.delivered_at || b.assigned_at || b.created_at || '';
      const timeA = a.delivered_at || a.assigned_at || a.created_at || '';
      return timeB.localeCompare(timeA);
    })[0] ?? null
  );
}

function jobLabel(job: { job_type: string; status: string }) {
  const type =
    job.job_type === 'food'
      ? JOB_TYPE_LABELS.food
      : job.job_type === 'parcel'
        ? JOB_TYPE_LABELS.parcel
        : job.job_type;
  const status =
    DELIVERY_JOB_STATUS_LABELS[job.status as keyof typeof DELIVERY_JOB_STATUS_LABELS] ??
    job.status;
  return `${type}·${status}`;
}

function buildFlowSteps(input: {
  status: OrderStatus;
  created_at: string;
  shipping_address: string | null;
  tracking_number: string | null;
  stripe_payment_id: string | null;
  jobs: OrderTraceDeliveryJob[];
  primaryJob: OrderTraceDeliveryJob | null;
  ledger_paid_at: string | null;
  ledger_settlement: string | null;
  courier_earning_amount: number | null;
}): OrderFlowStep[] {
  const {
    status,
    created_at,
    shipping_address,
    tracking_number,
    stripe_payment_id,
    jobs,
    primaryJob,
    ledger_paid_at,
    ledger_settlement,
    courier_earning_amount,
  } = input;

  const isPaid = PAID_STATUSES.includes(status);
  const isShipped =
    status === 'shipped' ||
    status === 'completed' ||
    status === 'refund_requested' ||
    status === 'refunded';
  const isTerminal = status === 'cancelled' || status === 'refunded';

  const created: OrderFlowStep = {
    key: 'created',
    label: '下單',
    state: 'done',
    detail: null,
    at: created_at,
  };

  const payment: OrderFlowStep = {
    key: 'payment',
    label: '付款',
    state: status === 'pending' ? 'pending' : isPaid ? 'done' : status === 'cancelled' ? 'skipped' : 'na',
    detail: stripe_payment_id ? `Stripe ${stripe_payment_id.slice(0, 12)}…` : null,
    at: ledger_paid_at,
  };

  const needsDelivery = Boolean(shipping_address?.trim()) && isPaid;

  let jobState: FlowStepState = 'na';
  let jobDetail: string | null = null;
  let jobAt: string | null = null;

  if (!needsDelivery) {
    jobState = isPaid ? 'skipped' : 'na';
    jobDetail = isPaid ? '無收貨地址' : null;
  } else if (jobs.length === 0) {
    jobState = isPaid ? 'warning' : 'pending';
    jobDetail = '尚未建立配送任務';
  } else if (jobs.length === 1) {
    jobState = 'done';
    jobDetail = jobLabel(jobs[0]);
    jobAt = jobs[0].created_at;
  } else {
    jobState = 'done';
    jobDetail = `${jobs.length} 筆：${jobs.map(jobLabel).join('、')}`;
    jobAt = jobs[0]?.created_at ?? null;
  }

  const deliveryJob: OrderFlowStep = {
    key: 'delivery_job',
    label: '配送任務',
    state: jobState,
    detail: jobDetail,
    at: jobAt,
  };

  let deliveryProgressState: FlowStepState = 'na';
  let deliveryProgressDetail: string | null = null;
  let deliveryProgressAt: string | null = null;

  if (needsDelivery && primaryJob) {
    switch (primaryJob.status) {
      case 'delivered':
        deliveryProgressState = 'done';
        deliveryProgressAt = primaryJob.delivered_at;
        deliveryProgressDetail = primaryJob.courier_name
          ? `${primaryJob.courier_name} 已送達`
          : '已送達';
        break;
      case 'picked_up':
        deliveryProgressState = 'active';
        deliveryProgressAt = primaryJob.picked_up_at;
        deliveryProgressDetail = primaryJob.courier_name
          ? `${primaryJob.courier_name} 運送中`
          : '運送中';
        break;
      case 'assigned':
        deliveryProgressState = 'active';
        deliveryProgressAt = primaryJob.assigned_at;
        deliveryProgressDetail = primaryJob.courier_name
          ? `${primaryJob.courier_name} 已接單`
          : '已接單';
        break;
      case 'pending':
        deliveryProgressState = isShipped ? 'warning' : 'pending';
        deliveryProgressDetail = '待配送員接單';
        break;
      case 'failed':
      case 'cancelled':
        deliveryProgressState = 'warning';
        deliveryProgressDetail = jobLabel(primaryJob);
        break;
      default:
        deliveryProgressState = 'pending';
        deliveryProgressDetail = jobLabel(primaryJob);
    }
  } else if (needsDelivery && jobs.length === 0) {
    deliveryProgressState = 'pending';
    deliveryProgressDetail = '—';
  }

  const deliveryProgress: OrderFlowStep = {
    key: 'delivery_progress',
    label: '配送進度',
    state: deliveryProgressState,
    detail: deliveryProgressDetail,
    at: deliveryProgressAt,
  };

  const shipped: OrderFlowStep = {
    key: 'shipped',
    label: '商家發貨',
    state: isShipped ? 'done' : isPaid ? 'pending' : isTerminal ? 'skipped' : 'na',
    detail: tracking_number ? `單號 ${tracking_number}` : isShipped ? '已標記發貨' : null,
    at: null,
  };

  let ledgerState: FlowStepState = 'na';
  if (isPaid) {
    ledgerState = ledger_paid_at ? 'done' : 'warning';
  }

  const ledger: OrderFlowStep = {
    key: 'ledger',
    label: '財務分錄',
    state: ledgerState,
    detail: ledger_settlement ? `結算：${ledger_settlement}` : ledger_paid_at ? '已入帳' : isPaid ? '缺失' : null,
    at: ledger_paid_at,
  };

  let earningState: FlowStepState = 'na';
  if (primaryJob?.status === 'delivered') {
    earningState = courier_earning_amount != null ? 'done' : 'warning';
  } else if (needsDelivery && isPaid) {
    earningState = 'pending';
  }

  const earning: OrderFlowStep = {
    key: 'courier_earning',
    label: '配送酬劳',
    state: earningState,
    detail:
      courier_earning_amount != null
        ? `HK$${courier_earning_amount.toFixed(2)}`
        : primaryJob?.status === 'delivered'
          ? '缺失'
          : null,
    at: primaryJob?.delivered_at ?? null,
  };

  return [created, payment, deliveryJob, deliveryProgress, shipped, ledger, earning];
}

function detectIssues(input: {
  status: OrderStatus;
  shipping_address: string | null;
  jobs: OrderTraceDeliveryJob[];
  primaryJob: OrderTraceDeliveryJob | null;
  ledger_paid_at: string | null;
  courier_earning_amount: number | null;
}): string[] {
  const issues: string[] = [];
  const { status, shipping_address, jobs, primaryJob, ledger_paid_at, courier_earning_amount } =
    input;

  const isPaid = PAID_STATUSES.includes(status);
  const needsDelivery = Boolean(shipping_address?.trim()) && isPaid;

  if (isPaid && !ledger_paid_at) {
    issues.push('已付款但無財務分錄');
  }

  if (needsDelivery && jobs.length === 0) {
    issues.push('已付款但無配送任務');
  }

  if (jobs.length > 1) {
    const statuses = new Set(jobs.map((j) => j.status));
    if (statuses.has('delivered') && statuses.has('pending')) {
      issues.push('多筆配送任務狀態不一致');
    }
  }

  if (status === 'shipped' && primaryJob?.status === 'pending') {
    issues.push('訂單已發貨但配送仍待接單');
  }

  if (status === 'paid' && primaryJob?.status === 'delivered') {
    issues.push('配送已送達但訂單仍為已付款（未標 completed）');
  }

  if (primaryJob?.status === 'delivered' && !courier_earning_amount) {
    issues.push('配送已送達但無配送員酬劳記錄');
  }

  if (status === 'refunded' && primaryJob && !['delivered', 'cancelled', 'failed'].includes(primaryJob.status)) {
    issues.push('訂單已退款但配送任務仍在進行');
  }

  return issues;
}

export async function getAdminOrderTraceList(
  page = 1,
  limit = 30,
  orderIdQuery?: string
): Promise<{
  rows: OrderTraceRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}> {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = (supabase as any)
    .from('orders')
    .select(
      `
      id, total, status, created_at, user_id, merchant_id,
      shipping_name, shipping_phone, shipping_address,
      payment_method, stripe_payment_id, tracking_number,
      merchants ( name )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (orderIdQuery?.trim()) {
    const q = orderIdQuery.trim();
    const fullUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (fullUuid.test(q)) {
      query = query.eq('id', q.toLowerCase());
    } else {
      const hex = q.replace(/-/g, '').toLowerCase();
      if (/^[0-9a-f]{8,32}$/.test(hex)) {
        const { data: idRows, error: idError } = await supabase
          .from('orders')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (idError) throw idError;

        const matchingIds = ((idRows || []) as { id: string }[])
          .filter((row) => row.id.replace(/-/g, '').toLowerCase().startsWith(hex))
          .map((row) => row.id);

        if (matchingIds.length === 0) {
          return { rows: [], totalCount: 0, page, totalPages: 1 };
        }
        query = query.in('id', matchingIds);
      }
    }
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const orders = (data || []) as Array<{
    id: string;
    total: number;
    status: OrderStatus;
    created_at: string;
    user_id: string | null;
    merchant_id: string | null;
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    payment_method: string | null;
    stripe_payment_id: string | null;
    tracking_number: string | null;
    merchants: { name: string } | { name: string }[] | null;
  }>;

  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) {
    return { rows: [], totalCount: count ?? 0, page, totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)) };
  }

  const [{ data: jobRows }, { data: ledgerRows }, { data: earningRows }] = await Promise.all([
    supabase
      .from('delivery_jobs')
      .select(
        'id, order_id, job_type, status, courier_id, assigned_at, picked_up_at, delivered_at, created_at, notes'
      )
      .in('order_id', orderIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('order_ledger')
      .select('order_id, paid_at, settlement_status')
      .in('order_id', orderIds),
    supabase
      .from('courier_delivery_earnings')
      .select('order_id, amount, delivery_job_id')
      .in('order_id', orderIds),
  ]);

  const courierIds = [
    ...new Set(
      ((jobRows || []) as { courier_id: string | null }[])
        .map((j) => j.courier_id)
        .filter(Boolean)
    ),
  ] as string[];

  const profileMap = new Map<string, string>();
  const buyerMap = new Map<string, string>();

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))] as string[];
  const allProfileIds = [...new Set([...courierIds, ...userIds])];

  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', allProfileIds);
    for (const p of (profiles || []) as { id: string; display_name: string | null }[]) {
      const name = p.display_name?.trim() || '';
      profileMap.set(p.id, name);
      if (userIds.includes(p.id)) buyerMap.set(p.id, name);
    }
  }

  const jobsByOrder = new Map<string, OrderTraceDeliveryJob[]>();
  for (const raw of (jobRows || []) as Array<{
    id: string;
    order_id: string;
    job_type: string;
    status: string;
    courier_id: string | null;
    assigned_at: string | null;
    picked_up_at: string | null;
    delivered_at: string | null;
    created_at: string;
    notes: string | null;
  }>) {
    const job: OrderTraceDeliveryJob = {
      id: raw.id,
      order_id: raw.order_id,
      job_type: raw.job_type,
      status: raw.status,
      courier_id: raw.courier_id,
      courier_name: raw.courier_id ? profileMap.get(raw.courier_id) || '配送員' : null,
      assigned_at: raw.assigned_at,
      picked_up_at: raw.picked_up_at,
      delivered_at: raw.delivered_at,
      created_at: raw.created_at,
      notes: raw.notes,
    };
    const list = jobsByOrder.get(raw.order_id) ?? [];
    list.push(job);
    jobsByOrder.set(raw.order_id, list);
  }

  const ledgerMap = new Map<string, { paid_at: string; settlement_status: string }>();
  for (const l of (ledgerRows || []) as {
    order_id: string;
    paid_at: string;
    settlement_status: string;
  }[]) {
    ledgerMap.set(l.order_id, { paid_at: l.paid_at, settlement_status: l.settlement_status });
  }

  const earningMap = new Map<string, number>();
  for (const e of (earningRows || []) as {
    order_id: string;
    amount: number;
    delivery_job_id: string;
  }[]) {
    earningMap.set(e.order_id, Number(e.amount));
  }

  const rows: OrderTraceRow[] = orders.map((o) => {
    const merchant = Array.isArray(o.merchants) ? o.merchants[0] : o.merchants;
    const delivery_jobs = jobsByOrder.get(o.id) ?? [];
    const primaryJob = pickPrimaryTraceJob(delivery_jobs);
    const ledger = ledgerMap.get(o.id);
    const courier_earning_amount = earningMap.get(o.id) ?? null;

    const steps = buildFlowSteps({
      status: o.status,
      created_at: o.created_at,
      shipping_address: o.shipping_address,
      tracking_number: o.tracking_number,
      stripe_payment_id: o.stripe_payment_id,
      jobs: delivery_jobs,
      primaryJob,
      ledger_paid_at: ledger?.paid_at ?? null,
      ledger_settlement: ledger?.settlement_status ?? null,
      courier_earning_amount,
    });

    const issues = detectIssues({
      status: o.status,
      shipping_address: o.shipping_address,
      jobs: delivery_jobs,
      primaryJob,
      ledger_paid_at: ledger?.paid_at ?? null,
      courier_earning_amount,
    });

    return {
      id: o.id,
      status: o.status,
      total: Number(o.total),
      created_at: o.created_at,
      merchant_name: merchant?.name ?? null,
      buyer_name: o.user_id ? buyerMap.get(o.user_id) || null : null,
      shipping_name: o.shipping_name,
      shipping_phone: o.shipping_phone,
      shipping_address: o.shipping_address,
      payment_method: o.payment_method,
      stripe_payment_id: o.stripe_payment_id,
      tracking_number: o.tracking_number,
      steps,
      delivery_jobs,
      issues,
      ledger_paid_at: ledger?.paid_at ?? null,
      ledger_settlement: ledger?.settlement_status ?? null,
      courier_earning_amount,
    };
  });

  const totalCount = count ?? rows.length;
  return {
    rows,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}
