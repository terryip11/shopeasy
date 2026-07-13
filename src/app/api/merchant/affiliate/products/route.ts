import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clampCommissionRate, getAffiliatePlatformSettings } from '@/lib/affiliate/settings';

const itemSchema = z.object({
  productId: z.string().uuid(),
  share_enabled: z.boolean(),
  commission_rate: z.number().min(0).max(1).nullable().optional(),
});

const patchSchema = z.object({
  products: z.array(itemSchema).min(1),
});

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, status, share_enabled, commission_rate')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}

export async function PATCH(request: NextRequest) {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
  }

  try {
    const { products } = patchSchema.parse(await request.json());
    const platform = await getAffiliatePlatformSettings();
    const supabase = createAdminClient();

    for (const item of products) {
      const patch: Record<string, unknown> = {
        share_enabled: item.share_enabled,
      };

      if (item.commission_rate !== undefined) {
        patch.commission_rate =
          item.commission_rate == null
            ? null
            : clampCommissionRate(item.commission_rate, platform);
      }

      const { error } = await (supabase as any)
        .from('products')
        .update(patch)
        .eq('id', item.productId)
        .eq('merchant_id', merchant.id);

      if (error) {
        if (error.message?.includes('share_enabled')) {
          return NextResponse.json({
            error: '請執行 supabase/migrate-v42-affiliate.sql',
          }, { status: 500 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
