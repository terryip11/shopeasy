import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  MapPinned,
  PackageCheck,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { LandingVariantId } from '@/lib/marketing/landing-theme-types';

const STEPS = [
  {
    step: '01',
    title: '選購落單',
    body: '逛店鋪與商品，加入購物車並填寫送貨地址。',
  },
  {
    step: '02',
    title: '確認付款',
    body: '支援轉數快等線下付款；信用卡則由平台代收（開通後）。',
  },
  {
    step: '03',
    title: '商家備貨取件',
    body: '商家確認訂單，配送員掃描取件碼後取貨出發。',
  },
  {
    step: '04',
    title: '送到你家',
    body: '即時追蹤配送進度，送達後完成這趟本地訂單。',
  },
] as const;

const TRUST = [
  { icon: Wallet, label: '轉數快等本地付款' },
  { icon: MapPinned, label: '地區配送與追蹤' },
  { icon: UtensilsCrossed, label: '餐飲＋零售都能開' },
  { icon: PackageCheck, label: '取件 QR 確認' },
] as const;

const AUDIENCES = [
  {
    icon: ShoppingBag,
    title: '買家',
    body: '瀏覽在地商品與美食，線上落單，支援轉數快等多種付款，追蹤配送進度。',
    href: '/products',
    cta: '去逛逛',
  },
  {
    icon: Store,
    title: '商家',
    body: '開店上架、管理訂單與取件點，餐飲與零售皆可經營，把街坊客源接到線上。',
    href: '/merchant/apply',
    cta: '申請開店',
  },
  {
    icon: Bike,
    title: '配送夥伴',
    body: '接單取件、送達結算，與平台商家協作，把訂單準時送到買家手上。',
    href: '/courier',
    cta: '了解配送',
  },
] as const;

type Props = { variant: LandingVariantId };

function tone(variant: LandingVariantId) {
  if (variant === 'market') {
    return {
      whatBg: 'bg-emerald-50',
      accent: 'text-teal-700',
      stepNum: 'text-teal-600',
      iconBg: 'bg-teal-50 text-teal-700',
      rolesBg: 'bg-white',
      ctaBg: 'bg-teal-950',
      trustIcon: 'bg-white text-teal-700 ring-emerald-200/80',
    };
  }
  if (variant === 'route') {
    return {
      whatBg: 'bg-slate-100',
      accent: 'text-orange-600',
      stepNum: 'text-orange-500',
      iconBg: 'bg-orange-50 text-orange-600',
      rolesBg: 'bg-slate-50',
      ctaBg: 'bg-slate-950',
      trustIcon: 'bg-white text-orange-600 ring-slate-200/80',
    };
  }
  return {
    whatBg: 'bg-stone-100',
    accent: 'text-orange-600',
    stepNum: 'text-orange-500/90',
    iconBg: 'bg-orange-50 text-orange-600',
    rolesBg: 'bg-stone-50',
    ctaBg: 'bg-stone-900',
    trustIcon: 'bg-white text-orange-600 ring-stone-200/80',
  };
}

export function PlatformLandingSections({ variant }: Props) {
  const t = tone(variant);
  const whatTitle =
    variant === 'market'
      ? '把街市與小店，接到每一個屋苑'
      : variant === 'route'
        ? '一條供應鏈，從購物車走到你家門口'
        : '一個把買、賣、送串起來的本地市場';

  return (
    <>
      <section
        id="what"
        className={`scroll-mt-20 border-b border-stone-200 px-4 py-20 sm:px-6 lg:px-8 ${t.whatBg}`}
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div>
            <p className={`text-sm font-medium tracking-wide ${t.accent}`}>平台是什麼</p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              {whatTitle}
            </h2>
          </div>
          <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
            ShopEasy 不是只放商品的目錄。我們幫買家找到可信店鋪，幫商家處理訂單與取件，
            再由配送夥伴完成最後一哩——全程為香港日常消費場景而設。
          </p>
        </div>

        <ul className="mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ${t.trustIcon}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="pt-2 text-sm font-medium leading-snug text-stone-800">
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="how" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className={`text-sm font-medium tracking-wide ${t.accent}`}>如何運作</p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              {variant === 'route' ? '四步完成一趟本地訂單' : '從下單到送達，四步走完'}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              流程清楚，買家、商家與配送各司其職，減少溝通成本。
            </p>
          </div>

          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <li key={item.step} className="relative">
                <p
                  className={`font-[family-name:var(--font-landing-display)] text-4xl font-semibold ${t.stepNum}`}
                >
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="roles"
        className={`scroll-mt-20 border-t border-stone-200 px-4 py-20 sm:px-6 lg:px-8 ${t.rolesBg}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className={`text-sm font-medium tracking-wide ${t.accent}`}>誰在使用</p>
            <h2 className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              三種角色，同一條供應鏈
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              無論你是想買、想賣，還是想送，都能在 ShopEasy 找到自己的位置。
            </p>
          </div>

          <ul className="mt-14 divide-y divide-stone-200 border-y border-stone-200">
            {AUDIENCES.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="grid gap-4 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${t.iconBg}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-stone-900">{item.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                      {item.body}
                    </p>
                  </div>
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80 ${t.accent}`}
                  >
                    {item.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={`relative overflow-hidden px-4 py-20 text-white sm:px-6 lg:px-8 ${t.ctaBg}`}>
        <div
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              準備好了嗎？
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              先逛一逛在地精選；若你是店主，再到下方申請入駐，把店鋪帶到更多街坊眼前。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-orange-400"
            >
              開始購物
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/merchant/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              商家入駐
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
