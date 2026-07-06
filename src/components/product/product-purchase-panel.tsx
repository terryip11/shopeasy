'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addToCart, type CartOptionSelection } from '@/lib/cart';

function notifyCartUpdated() {
  window.dispatchEvent(new Event('shopeasy-cart-updated'));
}

type Variant = {
  id: string;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
};

type Option = { id: string; name: string; price_delta: number };
type OptionGroup = {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: Option[];
};

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock?: number;
  };
};

export function ProductPurchasePanel({ product }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [basePrice, setBasePrice] = useState(product.price);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${product.id}/extras`)
      .then((r) => r.json())
      .then((data) => {
        if (data.variants) setVariants(data.variants);
        if (data.optionGroups) setOptionGroups(data.optionGroups);
        if (data.basePrice) setBasePrice(Number(data.basePrice));
      })
      .finally(() => setLoadingExtras(false));
  }, [product.id]);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const unitPrice = useMemo(() => {
    let price = selectedVariant?.price ?? basePrice;
    for (const group of optionGroups) {
      const ids = selectedOptions[group.id] ?? [];
      for (const optId of ids) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) price += Number(opt.price_delta);
      }
    }
    return price;
  }, [basePrice, selectedVariant, optionGroups, selectedOptions]);

  const maxQty = useMemo(() => {
    if (selectedVariant) return Math.max(selectedVariant.stock, 0);
    if (variants.length > 0) return 0;
    return product.stock !== undefined && product.stock > 0 ? product.stock : 99;
  }, [selectedVariant, variants.length, product.stock]);

  const toggleOption = (group: OptionGroup, optionId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(optionId);
      if (group.max_select === 1) {
        return { ...prev, [group.id]: exists ? [] : [optionId] };
      }
      if (exists) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const buildOptionSelections = (): CartOptionSelection[] =>
    optionGroups
      .map((group) => {
        const ids = selectedOptions[group.id] ?? [];
        if (ids.length === 0) return null;
        const labels = ids
          .map((id) => group.options.find((o) => o.id === id)?.name)
          .filter(Boolean) as string[];
        const price_delta = ids.reduce((sum, id) => {
          const opt = group.options.find((o) => o.id === id);
          return sum + (opt ? Number(opt.price_delta) : 0);
        }, 0);
        return { group_id: group.id, option_ids: ids, labels, price_delta };
      })
      .filter(Boolean) as CartOptionSelection[];

  const variantLabel = selectedVariant
    ? [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ')
    : '';

  const displayName = useMemo(() => {
    const parts = [product.name];
    if (variantLabel) parts.push(`（${variantLabel}）`);
    const optLabels = buildOptionSelections().flatMap((s) => s.labels);
    if (optLabels.length) parts.push(`+ ${optLabels.join('、')}`);
    return parts.join(' ');
  }, [product.name, variantLabel, selectedOptions, optionGroups]);

  const canAdd =
    maxQty >= 1 &&
    quantity >= 1 &&
    (variants.length === 0 || selectedVariantId) &&
    optionGroups.every((g) => {
      const count = (selectedOptions[g.id] ?? []).length;
      if (g.required && count < Math.max(g.min_select, 1)) return false;
      return true;
    });

  const handleAdd = () => {
    addToCart(
      {
        id: product.id,
        name: displayName,
        price: unitPrice,
        image: product.image,
        variant_id: selectedVariantId || undefined,
        variant_label: variantLabel || undefined,
        option_selections: buildOptionSelections(),
      },
      quantity
    );
    notifyCartUpdated();
    alert(`已加入購物車 × ${quantity}`);
    setQuantity(1);
  };

  if (loadingExtras) {
    return <p className="text-sm text-gray-500">載入規格...</p>;
  }

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">選擇規格</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const label = [v.size, v.color].filter(Boolean).join(' / ') || '規格';
              const disabled = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    selectedVariantId === v.id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${disabled ? 'opacity-40' : ''}`}
                >
                  {label} {disabled ? '（缺貨）' : `（${v.stock}）`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {optionGroups.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {group.name}
            {group.required && <span className="text-red-500"> *</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => {
              const selected = (selectedOptions[group.id] ?? []).includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOption(group, opt.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    selected
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {opt.name}
                  {opt.price_delta > 0 ? ` +$${Number(opt.price_delta).toFixed(0)}` : ''}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">數量</span>
        <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <Input
            type="number"
            min={1}
            max={maxQty || 1}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(maxQty || 1, Math.max(1, Number(e.target.value) || 1)))}
            className="h-10 w-16 border-0 text-center"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty || 1, q + 1))}
            disabled={quantity >= maxQty}
            className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {maxQty > 0 && maxQty < 99 && (
          <span className="text-sm text-gray-500">庫存 {maxQty} 件</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleAdd} className="px-8" disabled={!canAdd}>
          加入購物車
        </Button>
        <span className="text-sm text-gray-500">
          單價 <span className="font-semibold text-orange-500">HK${unitPrice.toFixed(2)}</span>
          {' · '}
          小計 <span className="font-semibold text-orange-500">HK${(unitPrice * quantity).toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}
