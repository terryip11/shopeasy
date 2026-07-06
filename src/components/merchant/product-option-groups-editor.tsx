'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionGroupDraft } from '@/lib/merchant/product-form-types';

type Props = {
  groups: OptionGroupDraft[];
  onChange: (groups: OptionGroupDraft[]) => void;
};

function emptyGroup(): OptionGroupDraft {
  return {
    name: '加料',
    min_select: 0,
    max_select: 1,
    required: false,
    options: [{ name: '例：加蛋', price_delta: 5 }],
  };
}

export function ProductOptionGroupsEditor({ groups, onChange }: Props) {
  const updateGroup = (index: number, patch: Partial<OptionGroupDraft>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<OptionGroupDraft['options'][number]>
  ) => {
    const group = groups[groupIndex];
    const options = group.options.map((o, i) => (i === optionIndex ? { ...o, ...patch } : o));
    updateGroup(groupIndex, { options });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">餐點選項</p>
          <p className="text-xs text-gray-500">例如加料、辣度、冰量；加價會在結帳時自動加總。</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...groups, emptyGroup()])}>
          <Plus className="mr-1 h-4 w-4" />
          新增選項群組
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
          可選：新增「加料」「辣度」等讓客人自訂餐點。
        </p>
      ) : (
        groups.map((group, gi) => (
          <div key={gi} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[8rem] flex-1">
                <Label>群組名稱</Label>
                <Input
                  value={group.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => updateGroup(gi, { required: e.target.checked })}
                />
                必選
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => onChange(groups.filter((_, i) => i !== gi))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {group.options.map((opt, oi) => (
                <div key={oi} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[10rem] flex-1">
                    <Input
                      value={opt.name}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                      placeholder="選項名稱"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step={0.5}
                      value={opt.price_delta}
                      onChange={(e) =>
                        updateOption(gi, oi, { price_delta: Number(e.target.value) || 0 })
                      }
                      placeholder="+HK$"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateGroup(gi, {
                        options: group.options.filter((_, i) => i !== oi),
                      })
                    }
                  >
                    刪
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateGroup(gi, {
                    options: [...group.options, { name: '', price_delta: 0 }],
                  })
                }
              >
                新增選項
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
