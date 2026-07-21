'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  LANDING_VARIANT_META,
  type LandingVariantId,
} from '@/lib/marketing/landing-theme-types';

type Props = {
  variant: LandingVariantId;
};

/**
 * 平台介紹 Hero：依版面變體切換視覺與語氣
 */
export function PlatformLandingHero({ variant }: Props) {
  const meta = LANDING_VARIANT_META[variant];

  if (variant === 'market') {
    return (
      <section className="landing-hero relative isolate min-h-[min(88vh,52rem)] overflow-hidden bg-emerald-50">
        <div
          className="landing-hero-media absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url('${meta.heroImage}')` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-emerald-950/75 via-teal-900/55 to-orange-900/25"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[min(88vh,52rem)] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:justify-center lg:px-8 lg:pb-24">
          <div className="max-w-2xl text-white">
            <p className="landing-rise font-[family-name:var(--font-landing-display)] text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              ShopEasy
            </p>
            <h1 className="landing-rise landing-rise-delay-1 mt-4 text-2xl font-semibold leading-snug sm:text-3xl lg:text-4xl">
              新鮮在地，像去街市一樣簡單
            </h1>
            <p className="landing-rise landing-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-emerald-50/95 sm:text-lg">
              美食外賣、日用品與街坊小店，一站選購，由配送夥伴送到你家。
            </p>
            <div className="landing-rise landing-rise-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-orange-400"
              >
                開始購物
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/20"
              >
                了解如何運作
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'route') {
    return (
      <section className="landing-hero relative isolate overflow-hidden bg-slate-950 text-white">
        <div
          className="landing-hero-media absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('${meta.heroImage}')` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950" aria-hidden />
        <div className="relative mx-auto grid min-h-[min(88vh,52rem)] max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-20">
          <div>
            <p className="landing-rise font-[family-name:var(--font-landing-display)] text-5xl font-semibold tracking-tight sm:text-6xl">
              ShopEasy
            </p>
            <h1 className="landing-rise landing-rise-delay-1 mt-4 text-2xl font-semibold leading-snug text-orange-100 sm:text-3xl lg:text-4xl">
              下單、取件、送到——一條路線走完
            </h1>
            <p className="landing-rise landing-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              專為香港本地配送而設：買家落單、商家備貨、配送夥伴送達，節奏清楚。
            </p>
            <div className="landing-rise landing-rise-delay-3 mt-9">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-orange-400"
              >
                開始購物
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <ol className="landing-rise landing-rise-delay-2 space-y-4 border-l border-orange-500/50 pl-6">
            {['選購落單', '確認付款', '掃描取件', '配送送達'].map((label, i) => (
              <li key={label} className="relative">
                <span className="absolute -left-[1.9rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-lg font-semibold text-white">{label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  // harbor（預設）
  return (
    <section className="landing-hero relative isolate min-h-[min(92vh,56rem)] overflow-hidden">
      <div
        className="landing-hero-media absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${meta.heroImage}')` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-stone-950/94 via-stone-950/82 to-stone-950/40"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-stone-950/45"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[min(92vh,56rem)] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:justify-center lg:px-8 lg:pb-24 lg:pt-24">
        <div className="max-w-2xl text-white">
          <p className="landing-rise font-[family-name:var(--font-landing-display)] text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            ShopEasy
          </p>
          <h1 className="landing-rise landing-rise-delay-1 mt-4 text-2xl font-semibold leading-snug tracking-tight text-orange-100 sm:text-3xl lg:text-4xl">
            本地好物與美食，送到你家
          </h1>
          <p className="landing-rise landing-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-stone-200 sm:text-lg">
            連接街坊買家、在地商家與配送夥伴，讓香港的日常購物更簡單、更可靠。
          </p>
          <div className="landing-rise landing-rise-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-orange-400"
            >
              開始購物
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/12"
            >
              了解如何運作
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
