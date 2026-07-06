'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VariantDraft } from '@/lib/merchant/product-form-types';

type Props = {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  basePrice: number;
};

function emptyVariant(): VariantDraft {
  return { size: '', color: '', sku: null, price: null, stock: 0 };
}

export function ProductVariantsEditor({ variants, onChange, basePrice }: Props) {
  const update = (index: number, patch: Partial<VariantDraft>) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">規格與庫存</p>
          <p className="text-xs text-gray-500">
            為服飾／鞋類設定呎碼、顏色與分規格庫存。基礎價 HK${basePrice.toFixed(2)}，規格價格留空則沿用基礎價。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...variants, emptyVariant()])}>
          <Plus className="mr-1 h-4 w-4" />
          新增規格
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
          尚未新增規格。一般零售可只用上方「庫存」；服飾／鞋類建議新增 S/M/L 等規格。
        </p>
      ) : (
        <div className="space-y-3">
          {variants.map((v, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2 lg:grid-cols-5"
            >
              <div>
                <Label>呎碼</Label>
                <Input
                  value={v.size ?? ''}
                  onChange={(e) => update(index, { size: e.target.value })}
                  placeholder="S / M / 38"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>顏色</Label>
                <Input
                  value={v.color ?? ''}
                  onChange={(e) => update(index, { color: e.target.value })}
                  placeholder="黑色"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>規格價格</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={v.price ?? ''}
                  onChange={(e) =>
                    update(index, {
                      price: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="留空=基礎價"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>庫存</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => update(index, { stock: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => onChange(variants.filter((_, i) => i !== index))}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  移除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
