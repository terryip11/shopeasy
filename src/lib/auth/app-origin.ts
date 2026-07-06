import { networkInterfaces } from 'node:os';

/** 正規化為 origin（不含尾隨斜線） */
export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isPrivateLanHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.startsWith('192.168.')) return true;
  if (hostname.startsWith('10.')) return true;
  const match = /^172\.(\d+)\./.exec(hostname);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/** 掃碼／郵件 magic link 的跳轉基底網址 */
export function resolveRedirectOrigin(override?: string | null): string {
  const configured =
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || '') ||
    'http://localhost:3000';

  if (!override?.trim()) return configured;

  const candidate = normalizeOrigin(override);
  if (!candidate) {
    throw new Error('INVALID_ORIGIN');
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    if (candidate !== configured) {
      throw new Error('ORIGIN_NOT_ALLOWED');
    }
    return candidate;
  }

  const { hostname } = new URL(candidate);
  if (!isPrivateLanHost(hostname)) {
    throw new Error('ORIGIN_NOT_ALLOWED');
  }

  return candidate;
}

/** 開發環境：建議給手機用的區域網路 origin */
export function getSuggestedMobileOrigins(port = 3000): string[] {
  if (process.env.NODE_ENV === 'production') return [];

  const origins = new Set<string>();
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || '');
  if (configured) {
    const { hostname } = new URL(configured);
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      origins.add(configured);
    }
  }

  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      if (addr.address.startsWith('169.254.')) continue;
      origins.add(`http://${addr.address}:${port}`);
    }
  }

  return [...origins];
}
