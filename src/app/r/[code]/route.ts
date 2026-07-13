import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AFFILIATE_COOKIE_NAME } from '@/lib/affiliate/client';
import { getAffiliatePlatformSettings } from '@/lib/affiliate/settings';

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const trimmed = code?.trim();
  if (!trimmed) {
    return NextResponse.redirect(new URL('/products', request.url));
  }

  const supabase = createAdminClient();
  const { data: link } = await (supabase as any)
    .from('share_links')
    .select('id, product_id, click_count')
    .eq('code', trimmed)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(new URL('/products', request.url));
  }

  await (supabase as any)
    .from('share_links')
    .update({ click_count: Number(link.click_count ?? 0) + 1 })
    .eq('id', link.id);

  const settings = await getAffiliatePlatformSettings();
  const maxAge = settings.attributionDays * 24 * 60 * 60;

  const redirectUrl = new URL(`/products/${link.product_id}`, request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(AFFILIATE_COOKIE_NAME, trimmed, {
    maxAge,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });

  return response;
}
