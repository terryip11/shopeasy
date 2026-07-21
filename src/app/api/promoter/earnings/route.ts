import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMerchantDirectPayout } from '@/lib/finance/monetization';
import { daysBetween } from '@/lib/merchant/payout-compliance';

export async function GET() {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const merchantDirect = await isMerchantDirectPayout();

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
      merchant_paid_at,
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
    id: string;
    net_amount: number;
    status: string;
    created_at: string;
    merchant_paid_at: string | null;
    merchants?: { name: string } | null;
    orders?: { id: string; total: number } | null;
  }>;

  const summary = {
    pending: 0,
    confirmed: 0,
    paid: 0,
  };

  for (const row of rows) {
    const amount = Number(row.net_amount ?? 0);
    if (row.merchant_paid_at || row.status === 'paid') summary.paid += amount;
    else if (row.status === 'pending') summary.pending += amount;
    else if (row.status === 'confirmed') summary.confirmed += amount;
  }

  const earnings = rows.map((row) => ({
    id: row.id,
    netAmount: Math.round(Number(row.net_amount ?? 0) * 100) / 100,
    status: row.status,
    createdAt: row.created_at,
    merchantPaidAt: row.merchant_paid_at,
    overdueDays: row.merchant_paid_at ? 0 : daysBetween(row.created_at),
    canReportUnpaid:
      merchantDirect &&
      !row.merchant_paid_at &&
      row.status !== 'paid' &&
      row.status !== 'reversed',
    merchantName: row.merchants?.name || '商家',
    orderId: row.orders?.id || null,
  }));

  return NextResponse.json({
    merchantDirect,
    earnings,
    summary: {
      pending: Math.round(summary.pending * 100) / 100,
      confirmed: Math.round(summary.confirmed * 100) / 100,
      paid: Math.round(summary.paid * 100) / 100,
    },
  });
}
