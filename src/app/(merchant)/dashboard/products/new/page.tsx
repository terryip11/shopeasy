import Link from 'next/link';
import { getCategories } from '@/lib/categories';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { listMenuCategories } from '@/lib/merchant/menu-categories';
import { normalizeBusinessType } from '@/lib/merchant/business-type';
import { MERCHANT_TIER_LIMITS, type MerchantTier } from '@/lib/merchant/tier-config';
import { getCourierMinBaseFees } from '@/lib/finance/platform-settings';
import { getEffectivePlatformFeeRate } from '@/lib/finance/monetization';
import { buildProductShippingContext } from '@/lib/merchant/product-shipping-hint';
import { listPickupLocationsForMerchant } from '@/lib/merchant/pickup-locations';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import { ProductForm } from '@/components/merchant/product-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const merchant = await getActiveMerchantForUser();
  const [categories, minFees, menuCategories, pickupLocations, platformFeeRate] =
    await Promise.all([
      getCategories(100),
      getCourierMinBaseFees().catch(() => ({ food: 0, parcel: 0 })),
      merchant ? listMenuCategories(merchant.id).catch(() => []) : Promise.resolve([]),
      merchant ? listPickupLocationsForMerchant(merchant.id).catch(() => []) : Promise.resolve([]),
      getEffectivePlatformFeeRate(merchant?.tier),
    ]);
  const tier = ((merchant?.tier as MerchantTier) || 'basic');
  const maxImages = MERCHANT_TIER_LIMITS[tier].maxImagesPerProduct;
  const businessType = normalizeBusinessType(merchant?.business_type);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">新增商品</h1>
      </div>
      <ProductForm
        categories={categories}
        mode="create"
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
      />
    </div>
  );
}
