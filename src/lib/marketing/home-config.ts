/**
 * 商品首頁模組配置（之後可改為 CMS / DB）
 */

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
};

export type HomeShortcut = {
  id: string;
  label: string;
  href: string;
  emoji: string;
  bg: string;
};

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: 'free-shipping',
    title: '全場商品 無門檻包郵到港',
    subtitle: '精選好物直送香港，安心購物',
    cta: '去逛逛',
    href: '/products',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
  },
];

export const HOME_SHORTCUTS: HomeShortcut[] = [
  { id: 'flash', label: '限時優惠', href: '/products', emoji: '⚡', bg: 'bg-red-50 text-red-600' },
  { id: 'new', label: '新品上架', href: '/products', emoji: '✨', bg: 'bg-orange-50 text-orange-600' },
  { id: 'categories', label: '全部分類', href: '/categories', emoji: '📦', bg: 'bg-sky-50 text-sky-600' },
  { id: 'stores', label: '熱門店鋪', href: '/categories', emoji: '🏪', bg: 'bg-emerald-50 text-emerald-600' },
  { id: 'cart', label: '購物車', href: '/cart', emoji: '🛒', bg: 'bg-amber-50 text-amber-600' },
  { id: 'orders', label: '我的訂單', href: '/orders', emoji: '📋', bg: 'bg-indigo-50 text-indigo-600' },
];

/** 分類 tab 第一項「推薦」 */
export const RECOMMENDED_TAB = { slug: '', label: '推薦' } as const;
