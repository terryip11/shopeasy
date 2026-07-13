'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MERCHANT_TIER_LABELS } from '@/lib/merchant/tier-config';
import type { TierMonthlyPrices } from '@/lib/merchant/tier-config';

type Props = {
  initialPrices: TierMonthlyPrices;
};

export function AdminMerchantTierPricingForm({ initialPrices }: Props) {
  const router = useRouter();
  const [premium, setPremium] = useState(String(initialPrices.premium));
  const [vip, setVip] = useState(String(initialPrices.vip));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const premiumValue = Number(premium);
    const vipValue = Number(vip);

    if (!Number.isFinite(premiumValue) || premiumValue <= 0 || premiumValue > 99999) {
      setError('高級商家月費須為 1–99999');
      return;
    }
    if (!Number.isFinite(vipValue) || vipValue <= 0 || vipValue > 99999) {
      setError('尊貴商家月費須為 1–99999');
      return;
    }
    if (vipValue < premiumValue) {
      setError('尊貴商家月費不可低於高級商家月費');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/admin/merchant-tier-pricing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premium: premiumValue, vip: vipValue }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || '儲存失敗');
      return;
    }

    setMessage(
      `已更新：${MERCHANT_TIER_LABELS.premium} HK$${data.premium} · ${MERCHANT_TIER_LABELS.vip} HK$${data.vip}`
    );
    router.refresh();
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tier-price-premium">{MERCHANT_TIER_LABELS.premium}月費（HKD）</Label>
          <p className="mt-1 text-xs text-gray-500">新訂閱與續訂結帳將使用此價格。</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">HK$</span>
            <Input
              id="tier-price-premium"
              type="number"
              min={1}
              max={99999}
              step={1}
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tier-price-vip">{MERCHANT_TIER_LABELS.vip}月費（HKD）</Label>
          <p className="mt-1 text-xs text-gray-500">須不低於高級商家月費。</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">HK$</span>
            <Input
              id="tier-price-vip"
              type="number"
              min={1}
              max={99999}
              step={1}
              value={vip}
              onChange={(e) => setVip(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        調整價格僅影響<strong>之後</strong>的 Stripe 訂閱結帳；既有訂閱在 Stripe 上仍按原合約金額續訂，直至商家重新訂閱或方案變更。
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? '儲存中...' : '儲存月費'}
      </Button>
    </form>
  );
}
