import { NextRequest, NextResponse } from 'next/server';
import { getProductExtras } from '@/lib/products/extras';

type RouteContext = { params: Promise<{ id: string }> };

/** 公開：商品規格與餐飲選項（供商品詳情頁 fallback） */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const extras = await getProductExtras(id);

  if (!extras) {
    return NextResponse.json({ error: '商品不存在' }, { status: 404 });
  }

  return NextResponse.json(extras);
}
