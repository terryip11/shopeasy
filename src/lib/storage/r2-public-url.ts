/**
 * R2 圖片公開網址（client + server 共用）
 */

export function getR2PublicBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  return base ? base.replace(/\/$/, '') : null;
}

export function buildR2PublicImageUrl(key: string): string {
  const base = getR2PublicBaseUrl();
  if (base) {
    return `${base}/${key}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (appUrl) {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${appUrl}/api/r2/${encodedKey}`;
  }

  throw new Error(
    '請在 .env.local 設定 NEXT_PUBLIC_R2_PUBLIC_URL（Cloudflare R2 公開網址，例如 https://pub-xxx.r2.dev）'
  );
}

/** 修正舊版錯誤的 r2.cloudflarestorage.com 網址 */
export function normalizeR2ImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
      const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
      return buildR2PublicImageUrl(key);
    }

    if (parsed.pathname.startsWith('/api/r2/')) {
      return url;
    }
  } catch {
    return url;
  }

  return url;
}
