/**
 * 生成 R2 上傳（伺服器端直傳，避免瀏覽器 CORS 問題）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPresignedUploadUrl, getPublicUrl } from '@/lib/storage';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function assertR2Config() {
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET
  ) {
    throw new Error('R2 設定不完整，請檢查 .env.local');
  }
  if (!process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    throw new Error(
      '請設定 NEXT_PUBLIC_R2_PUBLIC_URL（Cloudflare R2 公開 r2.dev 網址）或 NEXT_PUBLIC_APP_URL'
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = await rateLimit(`upload:image:${ip}`, 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `上傳過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    assertR2Config();

    const contentType = request.headers.get('content-type') ?? '';

    // 瀏覽器 FormData 上傳（推薦，無 CORS 問題）
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: '請選擇要上傳的檔案' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: '僅支援圖片檔案' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: '檔案大小不可超過 10MB' }, { status: 400 });
      }

      const key = `merchants/${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadToR2(key, buffer, file.type);
      const publicUrl = getPublicUrl('image', key);

      return NextResponse.json({ publicUrl, key });
    }

    // 舊版：回傳預簽名 URL（需 R2 設定 CORS）
    const body = await request.json();
    const fileName = body.fileName as string;
    const fileContentType = body.contentType as string | undefined;

    if (!fileName) {
      return NextResponse.json({ error: '檔名缺失' }, { status: 400 });
    }

    const key = `merchants/${user.id}/${Date.now()}-${fileName}`;
    const { url } = await createPresignedUploadUrl('image', key, {
      contentType: fileContentType,
    });
    const publicUrl = getPublicUrl('image', key);

    return NextResponse.json({ uploadUrl: url, key, publicUrl });
  } catch (error) {
    console.error('[upload/image]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
