'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PRODUCT_KIND_LABELS,
  RETAIL_PRODUCT_KINDS,
  type ProductKind,
  type RetailAttributes,
} from '@/lib/merchant/product-kinds';
import type { VariantDraft } from '@/lib/merchant/product-form-types';
import { ProductVariantsEditor } from '@/components/merchant/product-variants-editor';

type Props = {
  productKind: ProductKind;
  onProductKindChange: (kind: ProductKind) => void;
  attributes: RetailAttributes;
  onAttributesChange: (attrs: RetailAttributes) => void;
  variants: VariantDraft[];
  onVariantsChange: (variants: VariantDraft[]) => void;
  basePrice: number;
  showStockField: boolean;
};

export function ProductFormRetailSection({
  productKind,
  onProductKindChange,
  attributes,
  onAttributesChange,
  variants,
  onVariantsChange,
  basePrice,
  showStockField,
}: Props) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <p className="text-sm font-medium text-gray-900 dark:text-white">零售設定</p>

      <div>
        <Label htmlFor="product-kind-retail">商品類型</Label>
        <select
          id="product-kind-retail"
          value={productKind}
          onChange={(e) => onProductKindChange(e.target.value as ProductKind)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {RETAIL_PRODUCT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PRODUCT_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          服飾、鞋類建議在下方新增呎碼／顏色規格；一般商品可只用基礎庫存。
        </p>
      </div>

      {(productKind === 'apparel' || productKind === 'footwear') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="material">材質（選填）</Label>
            <Input
              id="material"
              value={attributes.material ?? ''}
              onChange={(e) => onAttributesChange({ ...attributes, material: e.target.value })}
              placeholder="棉、聚酯纖維…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fit">版型（選填）</Label>
            <Input
              id="fit"
              value={attributes.fit ?? ''}
              onChange={(e) => onAttributesChange({ ...attributes, fit: e.target.value })}
              placeholder="修身、寬鬆…"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="size-chart">呎碼表連結（選填）</Label>
            <Input
              id="size-chart"
              value={attributes.size_chart_url ?? ''}
              onChange={(e) =>
                onAttributesChange({ ...attributes, size_chart_url: e.target.value })
              }
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>
      )}

      <ProductVariantsEditor
        variants={variants}
        onChange={onVariantsChange}
        basePrice={basePrice}
      />

      {!showStockField && (
        <p className="text-xs text-gray-500">已設定規格時，總庫存由各規格庫存加總。</p>
      )}
    </div>
  );
}
