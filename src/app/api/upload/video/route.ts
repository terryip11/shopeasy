/**
 * 生成 S3 預簽名上傳 URL（僅限已登入用戶）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl, getPublicUrl } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const body = await request.json();
    const fileName = body.fileName as string;
    const contentType = body.contentType as string | undefined;

    if (!fileName) {
      return NextResponse.json({ error: '檔名缺失' }, { status: 400 });
    }

    const key = `videos/${user.id}/${Date.now()}-${fileName}`;
    const { url } = await createPresignedUploadUrl('video', key, { contentType });
    const publicUrl = getPublicUrl('video', key);

    return NextResponse.json({ uploadUrl: url, key, publicUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
