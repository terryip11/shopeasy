'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MERCHANT_TIER_LABELS, type MerchantTier } from '@/lib/merchant/tier-config';
import type { TierLimitsMap } from '@/lib/merchant/tier-config';

type Props = {
  initialLimits: TierLimitsMap;
};

const TIERS: MerchantTier[] = ['basic', 'premium', 'vip'];

export function AdminMerchantTierLimitsForm({ initialLimits }: Props) {
  const router = useRouter();
  const [limits, setLimits] = useState({
    basic: {
      maxProducts: String(initialLimits.basic.maxProducts),
      maxImagesPerProduct: String(initialLimits.basic.maxImagesPerProduct),
    },
    premium: {
      maxProducts: String(initialLimits.premium.maxProducts),
      maxImagesPerProduct: String(initialLimits.premium.maxImagesPerProduct),
    },
    vip: {
      maxProducts: String(initialLimits.vip.maxProducts),
      maxImagesPerProduct: String(initialLimits.vip.maxImagesPerProduct),
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const updateField = (
    tier: MerchantTier,
    field: 'maxProducts' | 'maxImagesPerProduct',
    value: string
  ) => {
    setLimits((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: TierLimitsMap = {
      basic: {
        maxProducts: Number(limits.basic.maxProducts),
        maxImagesPerProduct: Number(limits.basic.maxImagesPerProduct),
      },
      premium: {
        maxProducts: Number(limits.premium.maxProducts),
        maxImagesPerProduct: Number(limits.premium.maxImagesPerProduct),
      },
      vip: {
        maxProducts: Number(limits.vip.maxProducts),
        maxImagesPerProduct: Number(limits.vip.maxImagesPerProduct),
      },
    };

    for (const tier of TIERS) {
      const row = payload[tier];
      if (!Number.isFinite(row.maxProducts) || row.maxProducts < 1 || row.maxProducts > 9999) {
        setError('商品上限須為 1–9999');
        return;
      }
      if (
        !Number.isFinite(row.maxImagesPerProduct) ||
        row.maxImagesPerProduct < 1 ||
        row.maxImagesPerProduct > 50
      ) {
        setError('每件商品圖片上限須為 1–50');
        return;
      }
    }
    if (payload.premium.maxProducts < payload.basic.maxProducts) {
      setError('高級商家商品上限不可低於普通商家');
      return;
    }
    if (payload.vip.maxProducts < payload.premium.maxProducts) {
      setError('尊貴商家商品上限不可低於高級商家');
      return;
    }
    if (payload.premium.maxImagesPerProduct < payload.basic.maxImagesPerProduct) {
      setError('高級商家圖片上限不可低於普通商家');
      return;
    }
    if (payload.vip.maxImagesPerProduct < payload.premium.maxImagesPerProduct) {
      setError('尊貴商家圖片上限不可低於高級商家');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/admin/merchant-tier-limits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || '儲存失敗');
      return;
    }

    setMessage('已更新各等級商品與圖片上限');
    setLimits({
      basic: {
        maxProducts: String(data.basic.maxProducts),
        maxImagesPerProduct: String(data.basic.maxImagesPerProduct),
      },
      premium: {
        maxProducts: String(data.premium.maxProducts),
        maxImagesPerProduct: String(data.premium.maxImagesPerProduct),
      },
      vip: {
        maxProducts: String(data.vip.maxProducts),
        maxImagesPerProduct: String(data.vip.maxImagesPerProduct),
      },
    });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="space-y-4">
        {TIERS.map((tier) => (
          <div
            key={tier}
            className="grid gap-4 rounded-xl border border-gray-100 p-4 sm:grid-cols-2 dark:border-gray-800"
          >
            <p className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-white">
              {MERCHANT_TIER_LABELS[tier]}
            </p>
            <div>
              <Label htmlFor={`tier-products-${tier}`}>可上架商品數</Label>
              <Input
                id={`tier-products-${tier}`}
                type="number"
                min={1}
                max={9999}
                step={1}
                className="mt-2"
                value={limits[tier].maxProducts}
                onChange={(e) => updateField(tier, 'maxProducts', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`tier-images-${tier}`}>每件商品圖片數</Label>
              <Input
                id={`tier-images-${tier}`}
                type="number"
                min={1}
                max={50}
                step={1}
                className="mt-2"
                value={limits[tier].maxImagesPerProduct}
                onChange={(e) => updateField(tier, 'maxImagesPerProduct', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        儲存後立即生效於新上架／編輯商品檢查；已超過新上限的既有商品不會自動下架。
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? '儲存中...' : '儲存上限'}
      </Button>
    </form>
  );
}
