/** 0.0.0.0 僅供伺服器綁定，瀏覽器無法開啟；開發時改為 localhost */
export function sanitizeDevOrigin(originOrUrl: string): string {
  try {
    const url = originOrUrl.includes('://')
      ? new URL(originOrUrl)
      : new URL(originOrUrl, 'http://localhost');
    if (url.hostname === '0.0.0.0' || url.hostname === '::') {
      const port = url.port || '3000';
      return `http://localhost:${port}`;
    }
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}
