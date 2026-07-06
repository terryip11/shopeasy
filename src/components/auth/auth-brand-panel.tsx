import Link from 'next/link';
import { ShoppingBag, Shield, Truck, Zap } from 'lucide-react';

type Variant = 'signup' | 'login' | 'verify';

const COPY: Record<Variant, { badge: string; title: string; highlight: string; subtitle: string }> = {
  signup: {
    badge: '免費加入',
    title: '開啟你的',
    highlight: '輕鬆購物之旅',
    subtitle: '註冊即可瀏覽精選商品、追蹤訂單，並享受安全便捷的付款體驗。',
  },
  login: {
    badge: '歡迎回來',
    title: '繼續探索',
    highlight: 'ShopEasy 好物',
    subtitle: '登入後即可查看訂單、管理帳號，或前往商家與配送後台。',
  },
  verify: {
    badge: '只差一步',
    title: '驗證信箱',
    highlight: '即可完成註冊',
    subtitle: '我們已發送驗證連結，點擊後即可開始使用 ShopEasy。',
  },
};

const FEATURES = [
  { icon: ShoppingBag, label: '精選商家與商品' },
  { icon: Shield, label: '安全付款保障' },
  { icon: Truck, label: '即時配送追蹤' },
];

export function AuthBrandPanel({ variant }: { variant: Variant }) {
  const copy = COPY[variant];

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="auth-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#auth-grid)" />
        </svg>
      </div>
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white backdrop-blur-sm">
            S
          </span>
          <span className="text-xl font-bold tracking-tight">ShopEasy</span>
        </Link>
      </div>

      <div className="relative max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          <Zap className="h-4 w-4" />
          {copy.badge}
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
          {copy.title}
          <span className="mt-1 block text-orange-100">{copy.highlight}</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-orange-50/90">{copy.subtitle}</p>

        {variant !== 'verify' && (
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/90">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="relative text-sm text-orange-100/70">
        © {new Date().getFullYear()} ShopEasy · 香港優質購物平台
      </p>
    </div>
  );
}
