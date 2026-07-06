import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFinanceStaff } from '@/lib/auth/server';
import { upsertMonthlyCosts } from '@/lib/finance/stats';
import { logAdminAction } from '@/lib/admin/merchant-actions';

const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  supabase_cost: z.number().min(0),
  r2_cost: z.number().min(0),
  stripe_fees_reported: z.number().min(0),
  other_cost: z.number().min(0),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireFinanceStaff();
  if (!auth.authorized) {
    return NextResponse.json({ error: '需要財務人員權限' }, { status: auth.user ? 403 : 401 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const data = await upsertMonthlyCosts(body);

    await logAdminAction(
      auth.user!.id,
      'finance.monthly_costs_upsert',
      'platform_monthly_costs',
      body.month,
      body
    );

    return NextResponse.json({ costs: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const msg = (error as Error).message;
    if (msg.includes('platform_monthly_costs')) {
      return NextResponse.json(
        { error: '請先執行 supabase/migrate-v18-finance.sql' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
