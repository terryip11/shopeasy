import { Noto_Sans_TC, Outfit } from 'next/font/google';
import { PlatformLandingNav } from '@/components/marketing/platform-landing-nav';
import { PlatformLandingHero } from '@/components/marketing/platform-landing-hero';
import { PlatformLandingSections } from '@/components/marketing/platform-landing-sections';
import { PlatformLandingFooter } from '@/components/marketing/platform-landing-footer';
import type { LandingVariantId } from '@/lib/marketing/landing-theme-types';

const landingDisplay = Outfit({
  subsets: ['latin'],
  variable: '--font-landing-display',
  weight: ['500', '600', '700'],
});

const landingBody = Noto_Sans_TC({
  subsets: ['latin'],
  variable: '--font-landing-body',
  weight: ['400', '500', '600', '700'],
});

type Props = {
  variant: LandingVariantId;
};

/** 平台介紹落地頁殼層（首頁／關於頁共用） */
export function PlatformLandingPage({ variant }: Props) {
  const shellBg =
    variant === 'market' ? 'bg-emerald-50' : variant === 'route' ? 'bg-slate-100' : 'bg-stone-100';

  return (
    <div
      className={`${landingDisplay.variable} ${landingBody.variable} flex min-h-full flex-col font-[family-name:var(--font-landing-body)] ${shellBg}`}
    >
      <PlatformLandingNav />
      <main className="flex-1">
        <PlatformLandingHero variant={variant} />
        <PlatformLandingSections variant={variant} />
      </main>
      <PlatformLandingFooter />
    </div>
  );
}
