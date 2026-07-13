import Link from 'next/link';
import { MobileProductCard } from '@/components/marketing/mobile-product-card';
import type { Product } from '@/lib/products';
import type { StoreCategory } from '@/lib/merchant/store-page';

type Props = {
  products: Product[];
  storeSlug: string;
  q?: string;
  categorySlug?: string;
  categories?: StoreCategory[];
};

function sectionTitle(
  q?: string,
  categorySlug?: string,
  categories?: StoreCategory[]
): string {
  if (q && categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug)?.name;
    return cat ? `「${cat}」搜尋「${q}」` : `搜尋「${q}」`;
  }
  if (q) return `搜尋「${q}」`;
  if (categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug)?.name;
    return cat ?? '分類商品';
  }
  return '全部商品';
}

export function StoreProductGrid({
  products,
  storeSlug,
  q,
  categorySlug,
  categories,
}: Props) {
  const title = sectionTitle(q, categorySlug, categories);
  const hasFilter = Boolean(q || categorySlug);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {products.length > 0 && (
          <span className="text-xs text-gray-500">{products.length} 件</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500">
            {hasFilter ? '找不到符合條件的商品' : '此店鋪尚無上架商品'}
          </p>
          {hasFilter && (
            <Link
              href={`/stores/${storeSlug}`}
              className="mt-2 inline-block text-sm text-orange-600 hover:underline"
            >
              查看全部商品
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {products.map((product) => (
            <MobileProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              images={product.images}
              categoryName={product.categories?.name}
            />
          ))}
        </div>
      )}
    </section>
  );
}
