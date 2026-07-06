import { NextResponse } from 'next/server';
import { requireFinanceStaff } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordOrderLedger } from '@/lib/finance/ledger';
import { logAdminAction } from '@/lib/admin/merchant-actions';

/** 為尚未記帳的已付款訂單補建財務分錄 */
export async function POST() {
  const auth = await requireFinanceStaff();
  if (!auth.authorized) {
    return NextResponse.json({ error: '需要財務人員權限' }, { status: auth.user ? 403 : 401 });
  }

  const supabase = createAdminClient();
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('id, stripe_payment_id')
    .eq('status', 'paid');

  const orders = (paidOrders || []) as { id: string; stripe_payment_id: string | null }[];
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const o of orders) {
    const result = await recordOrderLedger(o.id, o.stripe_payment_id);
    if (result.skipped) skipped += 1;
    else if (result.ok) created += 1;
    else if (result.error) errors.push(`${o.id.slice(0, 8)}: ${result.error}`);
  }

  await logAdminAction(auth.user!.id, 'finance.ledger_backfill', 'order_ledger', 'batch', {
    created,
    skipped,
    error_count: errors.length,
  });

  return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) });
}
