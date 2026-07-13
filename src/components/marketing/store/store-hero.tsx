import { Store } from 'lucide-react';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { BUSINESS_TYPE_LABELS } from '@/lib/merchant/business-type';
import { MERCHANT_TIER_LABELS, type MerchantTier } from '@/lib/merchant/tier-config';
import { hexToRgb, normalizeStoreThemeColor } from '@/lib/merchant/store-theme';
import { StorePaymentBadges } from '@/components/marketing/store/store-payment-badges';
import type { StorePageMerchant } from '@/lib/merchant/store-page';

type Props = {
  merchant: StorePageMerchant;
  productCount: number;
};

export function StoreHero({ merchant, productCount }: Props) {
  const logoUrl = normalizeR2ImageUrl(merchant.logo_url);
  const bannerUrl = normalizeR2ImageUrl(merchant.banner_url);
  const themeColor = normalizeStoreThemeColor(merchant.theme_color);
  const themeRgb = hexToRgb(themeColor);
  const businessLabel = BUSINESS_TYPE_LABELS[merchant.business_type];
  const tier = merchant.tier as MerchantTier;
  const showTierBadge = tier === 'premium' || tier === 'vip';
  const tagline = merchant.store_tagline?.trim();
  const description = merchant.store_description?.trim();

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:rounded-3xl">
      {/* 橫幅 */}
      <div className="relative h-28 sm:h-36">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, rgba(${themeRgb}, 0.85), rgba(${themeRgb}, 0.25))`,
              }}
            />
          </>
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, rgba(${themeRgb}, 0.75))`,
            }}
          >
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                aria-hidden
                className="h-full w-full scale-150 object-cover opacity-20 blur-2xl"
              />
            )}
          </div>
        )}
      </div>

      {/* 店鋪資訊 */}
      <div className="relative px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
        <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${merchant.name} Logo`}
              className="h-20 w-20 shrink-0 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-gray-900 sm:h-24 sm:w-24"
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white text-white shadow-lg dark:border-gray-900 sm:h-24 sm:w-24"
              style={{ backgroundColor: themeColor }}
            >
              <Store className="h-9 w-9 sm:h-10 sm:w-10" />
            </div>
          )}

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-white sm:text-2xl">
                {merchant.name}
              </h1>
              {showTierBadge && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  {MERCHANT_TIER_LABELS[tier]}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {businessLabel} · 已上架 {productCount} 件商品
            </p>
          </div>
        </div>

        {tagline && (
          <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-100">{tagline}</p>
        )}

        {description && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {description}
          </p>
        )}

        <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/60">
          <StorePaymentBadges paymentMethods={merchant.payment_methods} variant="light" />
        </div>
      </div>
    </section>
  );
}
