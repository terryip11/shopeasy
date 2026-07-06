import Link from 'next/link';
import { HOME_BANNERS } from '@/lib/marketing/home-config';

export function ProductsHomeBanner() {
  const banner = HOME_BANNERS[0];
  if (!banner) return null;

  return (
    <Link
      href={banner.href}
      className={`block overflow-hidden rounded-2xl bg-gradient-to-r ${banner.gradient} p-4 text-white shadow-md active:opacity-95 md:p-6`}
    >
      <p className="text-lg font-bold leading-tight md:text-xl">{banner.title}</p>
      <p className="mt-1 text-sm text-white/90">{banner.subtitle}</p>
      <span className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
        {banner.cta} →
      </span>
    </Link>
  );
}
