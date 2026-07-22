import Link from 'next/link';
import { AppImage } from '@/components/shared/app-image';
import { MobileProductCard } from '@/components/marketing/mobile-product-card';
import type { Product } from '@/lib/products';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';

type Props = {
  products: Product[];
};

/** 橫向特價商品列（參考圖「百億補貼」區塊） */
export function ProductsFlashRow({ products }: Props) {
  const picks = products.slice(0, 8);
  if (picks.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 p-3 dark:from-red-950/30 dark:to-orange-950/20">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
          今日特價
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">精選好物限時優惠</span>
      </div>

      <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {picks.map((product) => {
          const raw = product.images?.[0];
          const imageUrl = normalizeR2ImageUrl(raw) ?? raw ?? '/next.svg';
          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="w-24 shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100 active:scale-95 dark:bg-gray-900 dark:ring-gray-800"
            >
              <div className="relative mx-auto aspect-square w-16 overflow-hidden rounded-lg bg-gray-100">
                <AppImage src={imageUrl} alt={product.name} fill className="object-cover" sizes="64px" />
              </div>
              <p className="mt-1.5 text-center text-sm font-bold text-red-500">
                HK${product.price.toFixed(0)}
              </p>
            </Link>
          );
        })}
      </div>

      {/* 桌面版可顯示較完整的卡片 */}
      <div className="mt-3 hidden gap-3 md:grid md:grid-cols-4 lg:grid-cols-4">
        {picks.slice(0, 4).map((product) => (
          <MobileProductCard
            key={`flash-${product.id}`}
            id={product.id}
            name={product.name}
            price={product.price}
            images={product.images}
            badge="特價"
          />
        ))}
      </div>
    </section>
  );
}
