export const THEME_STORAGE_KEY = 'shopeasy-theme';

export type ThemeId = 'light' | 'dark' | 'system' | 'warm' | 'ocean';

export const THEME_OPTIONS: {
  id: ThemeId;
  label: string;
  hint: string;
}[] = [
  { id: 'light', label: '亮色', hint: '經典白底橙色系' },
  { id: 'dark', label: '暗色', hint: '柔和淺灰護眼' },
  { id: 'system', label: '跟隨系統', hint: '自動跟隨裝置設定' },
  { id: 'warm', label: '暖色', hint: '柔和琥珀暖調' },
  { id: 'ocean', label: '海洋', hint: '清新藍色風格' },
];

export function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export function resolveIsDark(theme: ThemeId): boolean {
  if (theme === 'dark') return true;
  if (theme === 'system') {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const isDark = resolveIsDark(theme);
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', isDark);
  // 暗色主題為淺灰底，控件維持亮色風格
  root.style.colorScheme = 'light';
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('shopeasy-theme-change', { detail: theme }));
}

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeId(saved)) return saved;
  return 'light';
}

/** 防止首屏閃爍，於 layout 內嵌執行 */
export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k)||'light';var valid=['light','dark','system','warm','ocean'];if(valid.indexOf(t)<0)t='light';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme='light';if(dark)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`;
