import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFinanceStaff } from '@/lib/auth/server';
import { settleCourierPayroll } from '@/lib/finance/courier-payroll';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const bodySchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-01$/),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireFinanceStaff();
  if (!auth.authorized) {
    return NextResponse.json({ error: '需要財務人員權限' }, { status: auth.user ? 403 : 401 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result = await settleCourierPayroll(
      body.period_start,
      auth.user!.id,
      body.notes ?? null
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(
      auth.user!.id,
      'finance.courier_payroll_settle',
      'courier_payroll_runs',
      result.runId!,
      { period_start: body.period_start }
    );

    return NextResponse.json({ run_id: result.runId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
