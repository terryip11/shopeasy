import { MapPin, Truck } from 'lucide-react';
import { BUSINESS_TYPE_LABELS } from '@/lib/merchant/business-type';
import type { StorePageMerchant, StoreShippingHint } from '@/lib/merchant/store-page';

type DeliveryZone = {
  id: string;
  name: string;
  region: string | null;
};

type Props = {
  merchant: StorePageMerchant;
  zones: DeliveryZone[];
  shippingHint: StoreShippingHint;
};

const REGION_ORDER = ['港島', '九龍', '新界'] as const;

function formatShippingHint(hint: StoreShippingHint): string | null {
  const { minFee, maxFee } = hint;
  if (minFee == null) return null;
  if (maxFee != null && maxFee !== minFee) {
    return `商品運費 HK$${minFee.toFixed(0)} 起（依商品而定）`;
  }
  return `商品運費 HK$${minFee.toFixed(0)} 起`;
}

export function StoreDeliveryInfo({ merchant, zones, shippingHint }: Props) {
  const businessLabel = BUSINESS_TYPE_LABELS[merchant.business_type];
  const shippingText = formatShippingHint(shippingHint);

  const regionCounts = REGION_ORDER.map((region) => ({
    region,
    count: zones.filter((z) => z.region === region).length,
  })).filter((g) => g.count > 0);

  const zoneSummary =
    zones.length > 0
      ? regionCounts.map((g) => `${g.region} ${g.count} 區`).join('、')
      : null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(var(--store-theme-rgb),0.12)] text-[var(--store-theme)]">
          <Truck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">配送說明</h2>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <li>業務類型：{businessLabel}</li>
            {zoneSummary && (
              <li className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>平台配送覆蓋 {zones.length} 區（{zoneSummary}）</span>
              </li>
            )}
            {shippingText ? (
              <li>{shippingText}</li>
            ) : (
              <li>運費於結帳時按商品計算</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
