/**
 * 店鋪設置頁面
 */

import { getMerchantForUser } from '@/lib/auth/server';
import { getDeliveryZones } from '@/lib/courier/server';
import { MerchantStoreInfoForm } from '@/components/merchant/merchant-store-info-form';
import { MerchantStoreInfoCardHeader } from '@/components/merchant/merchant-store-info-card-header';
import { MerchantPaymentMethodsForm } from '@/components/merchant/merchant-payment-methods-form';
import { MerchantPayoutForm } from '@/components/merchant/merchant-payout-form';
import { normalizePaymentMethods } from '@/lib/merchant/payment-methods';
import { payoutFromMerchant } from '@/lib/merchant/payout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MerchantCourierFeesForm } from '@/components/merchant/merchant-courier-fees-form';
import { MerchantBusinessTypeForm } from '@/components/merchant/merchant-business-type-form';
import { MerchantDeliveryZonesCollapsible } from '@/components/merchant/merchant-delivery-zones-collapsible';
import { DEFAULT_COURIER_FEE_BY_JOB_TYPE } from '@/lib/finance/config';
import { normalizeBusinessType } from '@/lib/merchant/business-type';
import { isStripePaymentsEnabled } from '@/lib/payment/stripe';
import { ArrowLeft, Store, Truck, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStoreSettings() {
  const merchant = await getMerchantForUser();
  if (!merchant) return null;
  return {
    name: merchant.name,
    slug: merchant.slug,
    logoUrl: merchant.logo_url,
    paymentMethods: normalizePaymentMethods(merchant.payment_methods),
    payout: payoutFromMerchant(merchant),
    courierFeeFood: Number(merchant.courier_fee_food ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.food),
    courierFeeParcel: Number(merchant.courier_fee_parcel ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.parcel),
    businessType: normalizeBusinessType(merchant.business_type),
  };
}

export default async function SettingsPage() {
  const [storeSettings, zones] = await Promise.all([
    getStoreSettings(),
    getDeliveryZones(),
  ]);

  if (!storeSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            請先註冊店鋪
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            設定您的店鋪基本信息後即可開始經營
          </p>
          <Button asChild size="lg">
            <Link href="/signup">註冊帳號並申請開店</Link>
          </Button>
        </div>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopeasy.com';
  const storeUrl = `${appUrl.replace(/\/$/, '')}/stores/${storeSettings.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            店鋪設置
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理您的店鋪信息和配送設置</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Store Info */}
        <Card>
          <MerchantStoreInfoCardHeader />
          <CardContent>
            <MerchantStoreInfoForm
              initialName={storeSettings.name}
              initialSlug={storeSettings.slug}
              initialLogoUrl={storeSettings.logoUrl}
              storeUrl={storeUrl}
            />
          </CardContent>
        </Card>

        {/* Shipping Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>配送設置</CardTitle>
                <CardDescription>
                  配送員預設工資與配送區域（各商品可另行覆寫運費與工資）
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <MerchantBusinessTypeForm initialBusinessType={storeSettings.businessType} />
            <MerchantCourierFeesForm
              initialFoodFee={storeSettings.courierFeeFood}
              initialParcelFee={storeSettings.courierFeeParcel}
            />
            <div className="border-t pt-6">
              <MerchantDeliveryZonesCollapsible zones={zones} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 客人支付方式 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>客人支付方式</CardTitle>
              <CardDescription>
                選擇客人下單時可使用的付款方式
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MerchantPaymentMethodsForm
            initialMethods={storeSettings.paymentMethods}
            stripePaymentsEnabled={isStripePaymentsEnabled()}
          />
        </CardContent>
      </Card>

      {/* 商家收款方式 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle>收款方式</CardTitle>
              <CardDescription>
                設定銀行、轉數快、微信與支付寶收款資料，供客人線下付款時使用
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MerchantPayoutForm
            initial={storeSettings.payout}
            paymentMethods={storeSettings.paymentMethods}
            stripePaymentsEnabled={isStripePaymentsEnabled()}
          />
        </CardContent>
      </Card>

    </div>
  );
}

