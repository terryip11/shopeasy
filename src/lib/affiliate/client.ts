/** 瀏覽器端：讀取分享歸屬 Cookie */

export const AFFILIATE_COOKIE_NAME = 'shopeasy_affiliate';

export function getAffiliateRefFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AFFILIATE_COOKIE_NAME}=([^;]+)`)
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return null;
  }
}
