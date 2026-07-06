import Link from 'next/link';
import { MobileProductCard } from '@/components/marketing/mobile-product-card';
import type { Product } from '@/lib/products';

type Props = {
  products: Product[];
  title?: string;
  showShippingBadge?: boolean;
};

export function ProductsFeedSection({
  products,
  title = '為你推薦',
  showShippingBadge = true,
}: Props) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {products.length > 0 && (
          <span className="text-xs text-gray-500">{products.length} 件商品</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500">找不到符合條件的商品</p>
          <Link href="/products" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
            查看全部推薦
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {products.map((product, index) => (
            <MobileProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              images={product.images}
              categoryName={product.categories?.name}
              badge={showShippingBadge && index < 4 ? '包郵到港' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
