/**
 * 商品詳情頁
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteNavbar, prefetchSiteNavbarAuth } from '@/components/marketing/site-navbar';
import { Footer } from '@/components/marketing/footer';
import { AppImage } from '@/components/shared/app-image';
import { createClient } from '@/lib/supabase/server';
import { ProductPurchasePanel } from '@/components/product/product-purchase-panel';
import { getProductExtras } from '@/lib/products/extras';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import type { Product } from '@/lib/products';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [, { data }, extras] = await Promise.all([
    prefetchSiteNavbarAuth(),
    supabase
      .from('products')
      .select('*, merchants (name, slug), categories (name, slug)')
      .eq('id', id)
      .eq('status', 'published')
      .single(),
    getProductExtras(id),
  ]);

  const product = data as Product | null;
  if (!product) notFound();

  const raw = product.images?.[0];
  const imageUrl = normalizeR2ImageUrl(raw) ?? raw ?? '/next.svg';

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <SiteNavbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
            <AppImage
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">{product.merchants?.name}</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {product.name}
            </h1>
            <p className="mt-4 text-2xl font-bold text-orange-500">
              ${Number(product.price).toFixed(2)}
            </p>
            {product.description && (
              <p className="mt-4 text-gray-600 dark:text-gray-300">{product.description}</p>
            )}
            <div className="mt-8">
              <ProductPurchasePanel
                product={{
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image: imageUrl,
                  stock: product.stock,
                }}
                extras={
                  extras
                    ? {
                        basePrice: extras.basePrice,
                        variants: extras.variants,
                        optionGroups: extras.optionGroups,
                      }
                    : null
                }
              />
            </div>
            {product.merchants?.slug && (
              <Link
                href={`/stores/${product.merchants.slug}`}
                className="mt-4 inline-block text-sm text-orange-500 hover:underline"
              >
                查看店鋪
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
