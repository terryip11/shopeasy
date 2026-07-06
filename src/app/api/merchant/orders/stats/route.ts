import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

/** 待處理訂單數（待付款 + 已付款待發貨） */
export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '非商家帳號' }, { status: 403 });
  }

  const supabase = await createClient();

  const [{ count: pending }, { count: paid }] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('status', 'paid'),
  ]);

  return NextResponse.json({
    pending: pending || 0,
    paid: paid || 0,
    attention: (pending || 0) + (paid || 0),
  });
}
