import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { productCreateSchema } from '@/lib/merchant/products';
import { requireRole, getActiveMerchantForUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkCanAddProduct,
  checkImageCount,
  type MerchantTier,
} from '@/lib/merchant/tiers';
import {
  buildProductInsertPayload,
  persistProductExtras,
  productColumnHint,
} from '@/lib/merchant/product-api-helpers';

async function assertMerchant() {
  const auth = await requireRole(['merchant', 'admin', 'super_admin']);
  if (!auth.authorized) {
    return {
      error: NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 }),
      merchant: null,
    };
  }
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return {
      error: NextResponse.json({ error: '請先建立店鋪' }, { status: 400 }),
      merchant: null,
    };
  }
  return { error: null, merchant };
}

export async function GET() {
  const { error, merchant } = await assertMerchant();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { error, merchant } = await assertMerchant();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = productCreateSchema.parse(body);

    const tier = ((merchant!.tier as MerchantTier) || 'basic');
    const productLimit = await checkCanAddProduct(merchant!.id, tier);
    if (!productLimit.ok) {
      return NextResponse.json({ error: productLimit.error }, { status: 403 });
    }

    const imageLimit = checkImageCount(tier, parsed.images?.length ?? 0);
    if (!imageLimit.ok) {
      return NextResponse.json({ error: imageLimit.error }, { status: 403 });
    }

    const { row, variants, optionGroups, hasVariants } = await buildProductInsertPayload(
      parsed,
      merchant!
    );

    const supabase = await createClient();

    if (parsed.pickup_location_id) {
      const { data: loc } = await supabase
        .from('merchant_pickup_locations')
        .select('id')
        .eq('id', parsed.pickup_location_id)
        .eq('merchant_id', merchant!.id)
        .maybeSingle();
      if (!loc) {
        return NextResponse.json({ error: '取件點不存在或不屬於本店' }, { status: 400 });
      }
    }

    const { data, error: dbError } = await (supabase as any)
      .from('products')
      .insert({ ...row, merchant_id: merchant!.id })
      .select()
      .single();

    if (dbError) {
      const hint = productColumnHint(dbError.message || '');
      if (hint) return NextResponse.json({ error: hint }, { status: 500 });
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const productId = (data as { id: string }).id;
    await persistProductExtras(productId, {
      variants,
      optionGroups,
      hasVariants,
      syncVariants: true,
      syncOptionGroups: true,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    const hint = productColumnHint((err as Error).message || '');
    if (hint) return NextResponse.json({ error: hint }, { status: 500 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
