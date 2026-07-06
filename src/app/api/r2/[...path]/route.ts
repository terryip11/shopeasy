import { NextResponse } from 'next/server';
import { getR2Object } from '@/lib/storage/r2';

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const key = path.map((segment) => decodeURIComponent(segment)).join('/');

  if (!key.startsWith('merchants/')) {
    return NextResponse.json({ error: '無權限讀取' }, { status: 404 });
  }

  try {
    const object = await getR2Object(key);
    if (!object.Body) {
      return NextResponse.json({ error: '檔案不存在' }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': object.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error('[api/r2]', key, error);
    return NextResponse.json({ error: '讀取失敗' }, { status: 404 });
  }
}
