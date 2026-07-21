import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategories } from '@/lib/categories';
import { getMerchantProduct } from '@/lib/merchant/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { loadProductFormExtras } from '@/lib/merchant/product-api-helpers';
import { listMenuCategories } from '@/lib/merchant/menu-categories';
import { normalizeBusinessType } from '@/lib/merchant/business-type';
import type { ProductKind } from '@/lib/merchant/product-kinds';
import { MERCHANT_TIER_LIMITS, type MerchantTier } from '@/lib/merchant/tier-config';
import { getCourierMinBaseFees } from '@/lib/finance/platform-settings';
import { getEffectivePlatformFeeRate } from '@/lib/finance/monetization';
import { buildProductShippingContext } from '@/lib/merchant/product-shipping-hint';
import { listPickupLocationsForMerchant } from '@/lib/merchant/pickup-locations';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import { ProductForm } from '@/components/merchant/product-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const merchant = await getActiveMerchantForUser();
  const [product, categories, minFees, extras, menuCategories, pickupLocations, platformFeeRate] =
    await Promise.all([
      getMerchantProduct(id),
      getCategories(100),
      getCourierMinBaseFees().catch(() => ({ food: 0, parcel: 0 })),
      loadProductFormExtras(id).catch(() => ({ variants: [], option_groups: [] })),
      merchant ? listMenuCategories(merchant.id).catch(() => []) : Promise.resolve([]),
      merchant ? listPickupLocationsForMerchant(merchant.id).catch(() => []) : Promise.resolve([]),
      getEffectivePlatformFeeRate(merchant?.tier),
    ]);
  const tier = ((merchant?.tier as MerchantTier) || 'basic');
  const maxImages = MERCHANT_TIER_LIMITS[tier].maxImagesPerProduct;
  const businessType = normalizeBusinessType(merchant?.business_type);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回商品列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">編輯商品</h1>
        <p className="text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm
        categories={categories}
        mode="edit"
        maxImages={maxImages}
        shippingContext={buildProductShippingContext(merchant, minFees, platformFeeRate)}
        businessType={businessType}
        menuCategories={menuCategories}
        stripePaymentsEnabled={isStripePaymentsEnabled()}
        pickupLocations={pickupLocations.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          is_default: l.is_default,
        }))}
        initialData={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          category_id: product.category_id,
          images: product.images || [],
          status: product.status,
          checkout_shipping_fee: Number(product.checkout_shipping_fee ?? 0),
          courier_fee: product.courier_fee != null ? Number(product.courier_fee) : null,
          pickup_location_id: product.pickup_location_id,
          stock: Number(product.stock ?? 0),
          product_kind: (product as { product_kind?: ProductKind }).product_kind,
          menu_category_id: (product as { menu_category_id?: string | null }).menu_category_id,
          attributes: (product as { attributes?: Record<string, unknown> }).attributes,
          variants: extras.variants,
          option_groups: extras.option_groups,
        }}
      />
    </div>
  );
}
