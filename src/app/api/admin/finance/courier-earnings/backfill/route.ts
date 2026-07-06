import { NextResponse } from 'next/server';
import { requireFinanceStaff } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordCourierDeliveryEarning } from '@/lib/finance/courier-earnings';

/** 為已完成但未記帳的配送任務補建配送員工資 */
export async function POST() {
  const auth = await requireFinanceStaff();
  if (!auth.authorized) {
    return NextResponse.json({ error: '需要財務人員權限' }, { status: auth.user ? 403 : 401 });
  }

  const supabase = createAdminClient();
  const { data: jobs } = await supabase
    .from('delivery_jobs')
    .select('id')
    .eq('status', 'delivered')
    .not('courier_id', 'is', null);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const j of (jobs || []) as { id: string }[]) {
    const result = await recordCourierDeliveryEarning(j.id);
    if (result.skipped) skipped += 1;
    else if (result.ok) created += 1;
    else if (result.error) errors.push(`${j.id.slice(0, 8)}: ${result.error}`);
  }

  return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) });
}
