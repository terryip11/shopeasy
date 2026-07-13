import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('promoter_earnings')
    .select(
      `
      id,
      commission_base,
      commission_rate,
      commission_gross,
      platform_fee,
      net_amount,
      status,
      created_at,
      orders (id, total),
      merchants (name)
    `
    )
    .eq('promoter_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Array<{
    net_amount: number;
    status: string;
  }>;

  const summary = {
    pending: 0,
    confirmed: 0,
    paid: 0,
  };

  for (const row of rows) {
    const amount = Number(row.net_amount ?? 0);
    if (row.status === 'pending') summary.pending += amount;
    else if (row.status === 'confirmed') summary.confirmed += amount;
    else if (row.status === 'paid') summary.paid += amount;
  }

  return NextResponse.json({
    earnings: data || [],
    summary: {
      pending: Math.round(summary.pending * 100) / 100,
      confirmed: Math.round(summary.confirmed * 100) / 100,
      paid: Math.round(summary.paid * 100) / 100,
    },
  });
}
