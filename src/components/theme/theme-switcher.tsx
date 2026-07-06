'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Droplets, Flame, Monitor, Moon, Palette, Sun } from 'lucide-react';
import {
  applyTheme,
  getStoredTheme,
  resolveIsDark,
  THEME_OPTIONS,
  type ThemeId,
} from '@/lib/theme';

const THEME_ICONS: Record<ThemeId, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  warm: Flame,
  ocean: Droplets,
};

interface ThemeSwitcherProps {
  variant?: 'icon' | 'sidebar';
  collapsed?: boolean;
}

export function ThemeSwitcher({ variant = 'icon', collapsed = false }: ThemeSwitcherProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeId>('light');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const next = (event as CustomEvent<ThemeId>).detail;
      if (next) setTheme(next);
    };

    window.addEventListener('shopeasy-theme-change', handleThemeChange);
    return () => window.removeEventListener('shopeasy-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSelect = (next: ThemeId) => {
    setTheme(next);
    applyTheme(next);
    setMenuOpen(false);
  };

  const CurrentIcon = THEME_ICONS[theme];
  const isDark = resolveIsDark(theme);

  if (variant === 'sidebar') {
    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 hover:translate-x-1 hover:shadow-sm dark:text-gray-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? '切換主題' : undefined}
        >
          <Palette className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">主題：{THEME_OPTIONS.find((t) => t.id === theme)?.label}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 ${menuOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {menuOpen && (
          <div
            className={`absolute z-50 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 ${
              collapsed ? 'bottom-full left-0 mb-2 w-52' : 'bottom-full left-0 mb-2 w-full min-w-[14rem]'
            }`}
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = THEME_ICONS[option.id];
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                    active ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{option.hint}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-orange-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="icon-interactive flex items-center gap-1 text-gray-600 dark:text-gray-300"
        aria-label="切換主題"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={`主題：${THEME_OPTIONS.find((t) => t.id === theme)?.label}`}
      >
        <CurrentIcon className="h-5 w-5" />
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">選擇主題</p>
          {THEME_OPTIONS.map((option) => {
            const Icon = THEME_ICONS[option.id];
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(option.id)}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                  active ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{option.hint}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-orange-500" />}
              </button>
            );
          })}
          {theme === 'system' && (
            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              目前：{isDark ? '暗色' : '亮色'}（依系統）
            </p>
          )}
        </div>
      )}
    </div>
  );
}
