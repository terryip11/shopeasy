import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrCreateShareLink } from '@/lib/affiliate/share-links';
import { getAppUrl } from '@/lib/payment/stripe';

export async function POST(request: Request) {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const body = (await request.json()) as { productId?: string };
  const productId = body.productId?.trim();
  if (!productId) {
    return NextResponse.json({ error: '請提供商品 ID' }, { status: 400 });
  }

  const result = await getOrCreateShareLink(auth.user.id, productId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const appUrl = getAppUrl().replace(/\/$/, '');
  return NextResponse.json({
    code: result.code,
    shareUrl: `${appUrl}/r/${result.code}`,
    id: result.id,
  });
}

export async function GET() {
  const auth = await requireRole(['promoter', 'super_admin']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '僅分享員可使用' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('share_links')
    .select(
      `
      id,
      code,
      click_count,
      created_at,
      products (id, name, price, images),
      merchants (name, slug)
    `
    )
    .eq('promoter_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = getAppUrl().replace(/\/$/, '');
  const links = ((data || []) as Array<{
    id: string;
    code: string;
    click_count: number;
    created_at: string;
    products: { id: string; name: string; price: number; images: string[] } | null;
    merchants: { name: string; slug: string } | null;
  }>).map((row) => ({
    id: row.id,
    code: row.code,
    clickCount: row.click_count,
    createdAt: row.created_at,
    shareUrl: `${appUrl}/r/${row.code}`,
    product: row.products,
    merchant: row.merchants,
  }));

  return NextResponse.json({ links });
}
