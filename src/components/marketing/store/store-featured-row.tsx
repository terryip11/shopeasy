import Link from 'next/link';
import Image from 'next/image';
import { MobileProductCard } from '@/components/marketing/mobile-product-card';
import type { Product } from '@/lib/products';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';

type Props = {
  products: Product[];
  title?: string;
};

/** 店鋪精選／最新商品橫向列 */
export function StoreFeaturedRow({ products, title = '最新上架' }: Props) {
  const picks = products.slice(0, 8);
  if (picks.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        <span className="text-xs text-gray-500">{picks.length} 件</span>
      </div>

      <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {picks.map((product) => {
          const raw = product.images?.[0];
          const imageUrl = normalizeR2ImageUrl(raw) ?? raw ?? '/next.svg';
          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="w-24 shrink-0 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-100 active:scale-95 dark:bg-gray-800 dark:ring-gray-700"
            >
              <div className="relative mx-auto aspect-square w-16 overflow-hidden rounded-lg bg-gray-100">
                <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="64px" />
              </div>
              <p className="mt-1 line-clamp-2 text-center text-[10px] leading-tight text-gray-700 dark:text-gray-200">
                {product.name}
              </p>
              <p className="mt-0.5 text-center text-sm font-bold text-[var(--store-theme)]">
                HK${product.price.toFixed(0)}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-4">
        {picks.slice(0, 4).map((product) => (
          <MobileProductCard
            key={`featured-${product.id}`}
            id={product.id}
            name={product.name}
            price={product.price}
            images={product.images}
            categoryName={product.categories?.name}
          />
        ))}
      </div>
    </section>
  );
}
