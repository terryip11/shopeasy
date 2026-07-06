/**
 * 店鋪頁面
 */

import { notFound } from 'next/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { ProductCard } from '@/components/marketing/product-card';
import { createClient } from '@/lib/supabase/server';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import type { Merchant } from '@/lib/merchants';
import type { Product } from '@/lib/products';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchantData } = await supabase
    .from('merchants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  const merchant = merchantData as Merchant | null;
  if (!merchant) notFound();

  const { data: productsData } = await supabase
    .from('products')
    .select('*, merchants (name, slug), categories (name, slug)')
    .eq('merchant_id', merchant.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const products = (productsData || []) as Product[];
  const logoUrl = normalizeR2ImageUrl(merchant.logo_url);

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${merchant.name} Logo`}
              className="h-16 w-16 rounded-2xl border border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-2xl font-bold text-orange-600 dark:bg-orange-900/30">
              {merchant.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{merchant.name}</h1>
            <p className="mt-1 text-sm text-gray-500">店鋪網址：/stores/{merchant.slug}</p>
          </div>
        </div>
        {products.length === 0 ? (
          <p className="mt-8 text-gray-500">此店鋪尚無上架商品。</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                price={product.price}
                images={product.images}
                merchantName={merchant.name}
                categoryName={product.categories?.name}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
