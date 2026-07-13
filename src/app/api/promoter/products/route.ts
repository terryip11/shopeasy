import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';

export async function GET() {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const platform = await getAffiliatePlatformSettings();
  if (!platform.enabled) {
    return NextResponse.json({ products: [], enabled: false });
  }

  const supabase = createAdminClient();

  const { data: settingsRows } = await (supabase as any)
    .from('merchant_affiliate_settings')
    .select('merchant_id, default_commission_rate')
    .eq('enabled', true);

  const enabledMerchantIds = new Set(
    ((settingsRows || []) as { merchant_id: string }[]).map((r) => r.merchant_id)
  );

  if (enabledMerchantIds.size === 0) {
    return NextResponse.json({ products: [], enabled: true });
  }

  const defaultRateMap = new Map(
    ((settingsRows || []) as { merchant_id: string; default_commission_rate: number }[]).map(
      (r) => [r.merchant_id, Number(r.default_commission_rate ?? 0.1)]
    )
  );

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, images, commission_rate, merchant_id, merchants (id, name, slug)')
    .eq('status', 'published')
    .eq('share_enabled', true)
    .in('merchant_id', [...enabledMerchantIds]);

  if (error) {
    if (error.message.includes('share_enabled')) {
      return NextResponse.json({
        error: '請執行 supabase/migrate-v42-affiliate.sql',
      }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = ((data || []) as Array<{
    id: string;
    name: string;
    price: number;
    images: string[];
    commission_rate: number | null;
    merchant_id: string;
    merchants: { id: string; name: string; slug: string } | null;
  }>)
    .filter((row) => row.merchants)
    .map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      images: row.images,
      commissionRate: row.commission_rate ?? defaultRateMap.get(row.merchant_id) ?? 0.1,
      merchant: row.merchants!,
    }));

  return NextResponse.json({ products, enabled: true });
}
