'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MenuCategory } from '@/lib/merchant/product-form-types';
import {
  SPICY_LEVEL_LABELS,
  type FoodAttributes,
  type ProductKind,
} from '@/lib/merchant/product-kinds';
import type { OptionGroupDraft } from '@/lib/merchant/product-form-types';
import { ProductOptionGroupsEditor } from '@/components/merchant/product-option-groups-editor';

type Props = {
  menuCategoryId: string;
  onMenuCategoryIdChange: (id: string) => void;
  menuCategories: MenuCategory[];
  onMenuCategoriesChange: (categories: MenuCategory[]) => void;
  attributes: FoodAttributes;
  onAttributesChange: (attrs: FoodAttributes) => void;
  optionGroups: OptionGroupDraft[];
  onOptionGroupsChange: (groups: OptionGroupDraft[]) => void;
  productKind: ProductKind;
  onProductKindChange: (kind: ProductKind) => void;
};

export function ProductFormFoodSection({
  menuCategoryId,
  onMenuCategoryIdChange,
  menuCategories,
  onMenuCategoriesChange,
  attributes,
  onAttributesChange,
  optionGroups,
  onOptionGroupsChange,
  productKind,
  onProductKindChange,
}: Props) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/merchant/menu-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立失敗');
      onMenuCategoriesChange([...menuCategories, data.category]);
      onMenuCategoryIdChange(data.category.id);
      setNewCategoryName('');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-4 dark:border-orange-900/40 dark:bg-orange-950/20">
      <p className="text-sm font-medium text-gray-900 dark:text-white">餐飲設定</p>

      <div>
        <Label htmlFor="product-kind-food">商品類型</Label>
        <select
          id="product-kind-food"
          value={productKind}
          onChange={(e) => onProductKindChange(e.target.value as ProductKind)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="menu_item">餐點／餐飲</option>
        </select>
      </div>

      <div>
        <Label htmlFor="menu-category">店內餐單分類</Label>
        <select
          id="menu-category"
          value={menuCategoryId}
          onChange={(e) => onMenuCategoryIdChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">未分類</option>
          {menuCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新增分類，例如：主餐、小食、飲品"
          />
          <Button type="button" variant="outline" disabled={creating} onClick={() => void createCategory()}>
            新增
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="spicy">辣度</Label>
          <select
            id="spicy"
            value={attributes.spicy_level ?? 'none'}
            onChange={(e) =>
              onAttributesChange({
                ...attributes,
                spicy_level: e.target.value as FoodAttributes['spicy_level'],
              })
            }
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {Object.entries(SPICY_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={attributes.is_vegetarian ?? false}
              onChange={(e) =>
                onAttributesChange({ ...attributes, is_vegetarian: e.target.checked })
              }
            />
            素食
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="serving-note">出餐備註（選填）</Label>
        <Input
          id="serving-note"
          value={attributes.serving_note ?? ''}
          onChange={(e) => onAttributesChange({ ...attributes, serving_note: e.target.value })}
          placeholder="例如：需即時出餐、約 15 分鐘"
          className="mt-1"
        />
      </div>

      <ProductOptionGroupsEditor groups={optionGroups} onChange={onOptionGroupsChange} />
    </div>
  );
}
