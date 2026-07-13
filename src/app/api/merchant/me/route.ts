import { NextResponse } from 'next/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';

export async function GET() {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) {
    return NextResponse.json({ merchant: null });
  }

  return NextResponse.json({
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      logo_url: normalizeR2ImageUrl(merchant.logo_url),
    },
  });
}
