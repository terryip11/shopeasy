'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '@/components/merchant/image-uploader';
import type { ProductFormData } from '@/lib/merchant/products';
import type { Category } from '@/lib/categories';
import type { MerchantBusinessType } from '@/lib/merchant/business-type';
import {
  defaultProductKind,
  type FoodAttributes,
  type ProductKind,
  type RetailAttributes,
} from '@/lib/merchant/product-kinds';
import type { MenuCategory, OptionGroupDraft, VariantDraft } from '@/lib/merchant/product-form-types';
import { ProductFormFoodSection } from '@/components/merchant/product-form-food-section';
import { ProductFormRetailSection } from '@/components/merchant/product-form-retail-section';
import { productHasVariants } from '@/lib/merchant/product-form-types';

import {
  deliveryJobTypeLabel,
  estimateSingleItemOrderNet,
  platformMinCourierBase,
  resolveProductCourierBase,
  shopDefaultCourierFee,
  type ProductShippingContext,
} from '@/lib/merchant/product-shipping-hint';
import { STRIPE_FEE_FIXED_HKD, STRIPE_FEE_PERCENT } from '@/lib/finance/config';
import { BUSINESS_TYPE_LABELS } from '@/lib/merchant/business-type';

interface ProductFormProps {
  categories: Category[];
  initialData?: Partial<ProductFormData> & {
    id?: string;
    product_kind?: ProductKind;
    menu_category_id?: string | null;
    attributes?: Record<string, unknown>;
    variants?: VariantDraft[];
    option_groups?: OptionGroupDraft[];
  };
  mode: 'create' | 'edit';
  maxImages?: number;
  shippingContext: ProductShippingContext;
  businessType: MerchantBusinessType;
  menuCategories?: MenuCategory[];
  pickupLocations?: Array<{
    id: string;
    name: string;
    address: string;
    is_default: boolean;
  }>;
  /** Stripe 線上收款是否已開通；未開通時試算不顯示卡費 */
  stripePaymentsEnabled?: boolean;
}

export function ProductForm({
  categories,
  initialData,
  mode,
  maxImages = 2,
  shippingContext,
  businessType,
  menuCategories: initialMenuCategories = [],
  pickupLocations = [],
  stripePaymentsEnabled = false,
}: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [status, setStatus] = useState<ProductFormData['status']>(
    initialData?.status || 'draft'
  );
  const [stock, setStock] = useState(initialData?.stock?.toString() || '0');
  const [checkoutShippingFee, setCheckoutShippingFee] = useState(
    initialData?.checkout_shipping_fee?.toString() ?? '0'
  );
  const [courierFee, setCourierFee] = useState(
    initialData?.courier_fee != null ? String(initialData.courier_fee) : ''
  );
  const [pickupLocationId, setPickupLocationId] = useState(
    initialData?.pickup_location_id ?? ''
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [productKind, setProductKind] = useState<ProductKind>(
    initialData?.product_kind ?? defaultProductKind(businessType)
  );
  const [menuCategoryId, setMenuCategoryId] = useState(initialData?.menu_category_id ?? '');
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(initialMenuCategories);
  const [foodAttributes, setFoodAttributes] = useState<FoodAttributes>(
    (initialData?.attributes as FoodAttributes) ?? {}
  );
  const [retailAttributes, setRetailAttributes] = useState<RetailAttributes>(
    (initialData?.attributes as RetailAttributes) ?? {}
  );
  const [variants, setVariants] = useState<VariantDraft[]>(initialData?.variants ?? []);
  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>(
    initialData?.option_groups ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasVariants = productHasVariants(variants);
  const isFood = businessType === 'food';

  const shopDefault = shopDefaultCourierFee(shippingContext);
  const minBase = platformMinCourierBase(shippingContext);
  const jobLabel = deliveryJobTypeLabel(shippingContext.businessType);

  const shippingPreview = useMemo(() => {
    const itemPrice = Number(price) || 0;
    const shipping = Number(checkoutShippingFee) || 0;
    const enteredCourier =
      courierFee.trim() === '' ? null : Number(courierFee);
    const rawCourier = enteredCourier ?? shopDefault;
    const effectiveCourier = resolveProductCourierBase(enteredCourier, shippingContext);
    const baseInput = {
      price: itemPrice,
      shippingFee: shipping,
      courierBase: effectiveCourier,
      platformFeeRate: shippingContext.platformFeeRate,
    };
    const offline = estimateSingleItemOrderNet({ ...baseInput, includeStripe: false });
    const card = estimateSingleItemOrderNet({ ...baseInput, includeStripe: true });
    return {
      enteredCourier,
      rawCourier,
      effectiveCourier,
      belowMin: minBase > 0 && rawCourier < minBase,
      shippingBelowCourier: shipping < effectiveCourier,
      offline,
      card,
    };
  }, [price, checkoutShippingFee, courierFee, shopDefault, minBase, shippingContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const shippingFee = Number(checkoutShippingFee);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      setError('請輸入有效的結帳運費');
      setLoading(false);
      return;
    }

    let productCourierFee: number | null = null;
    if (courierFee.trim() !== '') {
      const parsed = Number(courierFee);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('請輸入有效的配送員工資，或留空使用店鋪預設');
        setLoading(false);
        return;
      }
      productCourierFee = parsed;
    }

    const payload = {
      name,
      description: description || null,
      price: parseFloat(price),
      stock: hasVariants ? 0 : parseInt(stock, 10) || 0,
      category_id: categoryId || null,
      images,
      status,
      checkout_shipping_fee: shippingFee,
      courier_fee: productCourierFee,
      pickup_location_id: pickupLocationId || null,
      product_kind: productKind,
      menu_category_id: isFood && menuCategoryId ? menuCategoryId : null,
      attributes: isFood ? foodAttributes : retailAttributes,
      variants: !isFood ? variants : [],
      option_groups: isFood ? optionGroups : [],
    };

    const url =
      mode === 'create'
        ? '/api/merchant/products'
        : `/api/merchant/products/${initialData?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');

      router.push('/dashboard/products');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const applyShippingPreset = (shipping: number, courier: number | null) => {
    setCheckoutShippingFee(String(shipping));
    setCourierFee(courier == null ? '' : String(courier));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <Label htmlFor="name">商品名稱 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">商品描述</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      {isFood ? (
        <ProductFormFoodSection
          menuCategoryId={menuCategoryId}
          onMenuCategoryIdChange={setMenuCategoryId}
          menuCategories={menuCategories}
          onMenuCategoriesChange={setMenuCategories}
          attributes={foodAttributes}
          onAttributesChange={setFoodAttributes}
          optionGroups={optionGroups}
          onOptionGroupsChange={setOptionGroups}
          productKind={productKind}
          onProductKindChange={setProductKind}
        />
      ) : (
        <ProductFormRetailSection
          productKind={productKind}
          onProductKindChange={setProductKind}
          attributes={retailAttributes}
          onAttributesChange={setRetailAttributes}
          variants={variants}
          onVariantsChange={setVariants}
          basePrice={Number(price) || 0}
          showStockField={!hasVariants}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">價格 (HKD) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        {!hasVariants && (
        <div>
          <Label htmlFor="stock">庫存 *</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={hasVariants ? 'col-span-2' : ''}>
          <Label htmlFor="status">狀態</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductFormData['status'])}
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="draft">草稿</option>
            <option value="published">上架</option>
            <option value="archived">封存</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-4 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">配送與運費</p>
          <p className="mt-1 text-xs text-gray-500">
            店鋪類型：<strong>{BUSINESS_TYPE_LABELS[shippingContext.businessType]}</strong>
            ，此商品預設建立 <strong>{jobLabel}</strong> 任務。同一訂單含多件商品時，運費與工資皆取最高值。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyShippingPreset(0, null)}
          >
            免運（用工資預設）
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyShippingPreset(shopDefault, null)}
          >
            運費 ≈ 店鋪工資
          </Button>
          {minBase > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyShippingPreset(minBase, minBase)}
            >
              對齊平台保底 HK${minBase}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkout-shipping-fee">向買家收取運費（每單）</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="checkout-shipping-fee"
                type="number"
                min={0}
                step={1}
                value={checkoutShippingFee}
                onChange={(e) => setCheckoutShippingFee(e.target.value)}
              />
              <span className="text-sm text-gray-500 shrink-0">HKD</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">買家結帳時加在商品金額上；0 表示此商品免運</p>
          </div>
          <div>
            <Label htmlFor="courier-fee">支付配送員工資（每單）</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="courier-fee"
                type="number"
                min={0}
                step={1}
                value={courierFee}
                onChange={(e) => setCourierFee(e.target.value)}
                placeholder={`留空 → 店鋪預設 HK$${shopDefault}`}
              />
              <span className="text-sm text-gray-500 shrink-0">HKD</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              留空使用店鋪預設 HK${shopDefault}
              {minBase > 0 && `；平台保底 HK$${minBase}`}
              。工資由您以 FPS 直付配送員，不會從訂單自動扣除；完成後請至
              <Link href="/dashboard/payables" className="mx-0.5 text-orange-600 hover:underline">
                應付佣金／工資
              </Link>
              標記已付。
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="pickup-location">發貨取件點</Label>
          <select
            id="pickup-location"
            value={pickupLocationId}
            onChange={(e) => setPickupLocationId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">使用店鋪預設取件點</option>
            {pickupLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.is_default ? '（預設）' : ''} — {loc.address}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            配送員會前往此地址取件。可在「店鋪設置 → 取件點管理」新增更多地址。
            {pickupLocations.length === 0 && ' 目前尚未設定取件點。'}
          </p>
        </div>

        {(shippingPreview.belowMin || shippingPreview.shippingBelowCourier) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <ul className="list-inside list-disc space-y-1 text-xs">
                {shippingPreview.belowMin && (
                  <li>
                    工資設定低於平台保底，實際將以 HK${shippingPreview.effectiveCourier} 支付配送員
                  </li>
                )}
                {shippingPreview.shippingBelowCourier && (
                  <li>
                    向買家收取的運費（HK${Number(checkoutShippingFee) || 0}）低於配送成本（HK$
                    {shippingPreview.effectiveCourier}），此商品可能每單虧損
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/40">
          <p className="font-medium text-gray-900 dark:text-white">本商品單件訂單試算</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            <dt>商品 + 收取客戶的運費</dt>
            <dd className="text-right text-gray-900 dark:text-white">
              HK${shippingPreview.offline.gmv.toFixed(2)}
            </dd>
            {shippingContext.platformFeeRate > 0 && (
              <>
                <dt>
                  平台服務費
                  <span className="block font-normal text-gray-400">
                    {(shippingContext.platformFeeRate * 100).toFixed(1)}%（依訂閱等級）
                  </span>
                </dt>
                <dd className="text-right text-red-600 dark:text-red-400">
                  −HK${shippingPreview.offline.platformFee.toFixed(2)}
                </dd>
              </>
            )}
            <dt>配送員工資（實際）</dt>
            <dd className="text-right text-red-600 dark:text-red-400">
              −HK${shippingPreview.effectiveCourier.toFixed(2)}
            </dd>
            <dt className="border-t border-gray-200 pt-1 font-medium text-gray-900 dark:border-gray-700 dark:text-white">
              約落袋（線下付款）
            </dt>
            <dd
              className={`border-t border-gray-200 pt-1 text-right font-medium dark:border-gray-700 ${
                shippingPreview.offline.netAfterDelivery < 0
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {shippingPreview.offline.netAfterDelivery >= 0 ? '+' : ''}
              HK${shippingPreview.offline.netAfterDelivery.toFixed(2)}
            </dd>
            {stripePaymentsEnabled && (
              <>
                <dt>
                  Stripe 手續費
                  <span className="block font-normal text-gray-400">
                    {(STRIPE_FEE_PERCENT * 100).toFixed(1)}% + HK${STRIPE_FEE_FIXED_HKD}
                  </span>
                </dt>
                <dd className="text-right text-red-600 dark:text-red-400">
                  −HK${shippingPreview.card.stripeFee.toFixed(2)}
                </dd>
                <dt className="font-medium text-gray-900 dark:text-white">約落袋（信用卡）</dt>
                <dd
                  className={`text-right font-medium ${
                    shippingPreview.card.netAfterDelivery < 0
                      ? 'text-red-600'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {shippingPreview.card.netAfterDelivery >= 0 ? '+' : ''}
                  HK${shippingPreview.card.netAfterDelivery.toFixed(2)}
                </dd>
              </>
            )}
          </dl>
          <p className="mt-2 text-xs text-gray-400">
            {shippingContext.platformFeeRate > 0
              ? '試算僅供參考。訂閱為主時仍可能另有平台服務費；未含包裝等其他成本。'
              : '試算僅供參考（訂閱為主，不抽訂單服務費）。工資另以 FPS 直付。未含包裝等其他成本。'}
            {!stripePaymentsEnabled && ' 線上信用卡收款尚未開放。'}
          </p>
        </div>

        <p className="text-xs text-gray-400">
          修改店鋪預設工資請至{' '}
          <Link href="/dashboard/settings" className="text-orange-600 hover:underline">
            店鋪設置 → 配送設置
          </Link>
        </p>
      </div>

      <div>
        <Label htmlFor="category">分類</Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">無分類</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>商品圖片</Label>
        <p className="mt-1 text-xs text-gray-500">
          已上傳 {images.length} / {maxImages} 張（依商家等級限制）
        </p>
        <div className="mt-2">
          <ImageUploader
            multiple
            onUpload={(url) => {
              if (images.length >= maxImages) {
                setError(`每件商品最多 ${maxImages} 張圖片，請申請升級商家等級`);
                return;
              }
              setImages((prev) => [...prev, url]);
            }}
          />
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? '儲存中...' : mode === 'create' ? '建立商品' : '儲存變更'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
