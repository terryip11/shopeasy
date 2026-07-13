export const DEFAULT_STORE_THEME = '#f97316';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** 驗證並回傳可用主題色 */
export function normalizeStoreThemeColor(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (trimmed && HEX_COLOR.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return DEFAULT_STORE_THEME;
}

export function storeThemeCssVars(themeColor: string): Record<string, string> {
  const normalized = normalizeStoreThemeColor(themeColor);
  return {
    '--store-theme': normalized,
    '--store-theme-rgb': hexToRgb(normalized),
  };
}

/** 將 #RRGGBB 轉為 rgb 字串，供漸層使用 */
export function hexToRgb(hex: string): string {
  const normalized = normalizeStoreThemeColor(hex).slice(1);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export const STORE_THEME_PRESETS = [
  { label: '活力橙', value: '#f97316' },
  { label: '海洋藍', value: '#0ea5e9' },
  { label: '森林綠', value: '#10b981' },
  { label: '典雅紫', value: '#8b5cf6' },
  { label: '玫瑰紅', value: '#f43f5e' },
  { label: '石墨黑', value: '#374151' },
] as const;
