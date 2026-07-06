import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, getActiveMerchantForUser } from '@/lib/auth/server';
import { createMenuCategory, listMenuCategories } from '@/lib/merchant/menu-categories';

const bodySchema = z.object({
  name: z.string().min(1, '請輸入分類名稱').max(40),
});

export async function GET() {
  const auth = await requireRole(['merchant', 'admin', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
  }
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先建立店鋪' }, { status: 400 });
  }

  try {
    const categories = await listMenuCategories(merchant.id);
    return NextResponse.json({ categories });
  } catch (err) {
    const msg = (err as Error).message || '';
    if (msg.includes('merchant_menu_categories')) {
      return NextResponse.json(
        {
          error:
            '資料庫尚未建立餐單分類表，請執行 supabase/migrate-v35-merchant-menu-categories.sql',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['merchant', 'admin', 'super_admin']);
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
  }
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ error: '請先建立店鋪' }, { status: 400 });
  }

  try {
    const { name } = bodySchema.parse(await request.json());
    const category = await createMenuCategory(merchant.id, name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
