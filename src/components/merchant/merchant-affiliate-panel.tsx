'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MerchantAffiliateFeeSection } from '@/components/merchant/merchant-affiliate-fee-section';

type ProductRow = {  id: string;
  name: string;
  price: number;
  status: string;
  share_enabled: boolean;
  commission_rate: number | null;
};

type PlatformSettings = {
  platformCutRate: number;
  minCommissionRate: number;
  maxCommissionRate: number;
};

export function MerchantAffiliatePanel() {
  const [enabled, setEnabled] = useState(false);
  const [defaultRate, setDefaultRate] = useState('10');
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [platformFeeRate, setPlatformFeeRate] = useState(0.02);
  const [stripePaymentsEnabled, setStripePaymentsEnabled] = useState(false);  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsRes, productsRes] = await Promise.all([
        fetch('/api/merchant/affiliate/settings'),
        fetch('/api/merchant/affiliate/products'),
      ]);
      const settingsData = await settingsRes.json();
      const productsData = await productsRes.json();
      if (!settingsRes.ok) throw new Error(settingsData.error || '載入設定失敗');
      if (!productsRes.ok) throw new Error(productsData.error || '載入商品失敗');
      setEnabled(Boolean(settingsData.enabled));
      setDefaultRate(String(Math.round(Number(settingsData.defaultCommissionRate ?? 0.1) * 100)));
      setPlatform(settingsData.platform ?? null);
      setPlatformFeeRate(Number(settingsData.platformFeeRate ?? 0.02));
      setStripePaymentsEnabled(Boolean(settingsData.stripePaymentsEnabled));
      setProducts(productsData.products || []);    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/merchant/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          default_commission_rate: Number(defaultRate) / 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setMessage('已儲存分享計劃設定');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product: ProductRow, shareEnabled: boolean) => {
    setError('');
    try {
      const res = await fetch('/api/merchant/affiliate/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ productId: product.id, share_enabled: shareEnabled }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, share_enabled: shareEnabled } : p))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateProductRate = async (product: ProductRow, percent: string) => {
    const rate = percent.trim() === '' ? null : Number(percent) / 100;
    if (rate != null && (Number.isNaN(rate) || rate < 0 || rate > 1)) return;

    try {
      const res = await fetch('/api/merchant/affiliate/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ productId: product.id, share_enabled: product.share_enabled, commission_rate: rate }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, commission_rate: rate } : p))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        載入中...
      </div>
    );
  }

  const published = products.filter((p) => p.status === 'published');

  return (
    <div className="space-y-6">
      {platform && (
        <MerchantAffiliateFeeSection
          defaultCommissionPercent={Number(defaultRate) || 10}
          platformFeeRate={platformFeeRate}
          platform={platform}
          stripePaymentsEnabled={stripePaymentsEnabled}
        />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">        <h2 className="font-semibold text-gray-900 dark:text-white">分享推廣計劃</h2>
        <p className="mt-1 text-sm text-gray-500">
          開啟後，分享員可推廣您允許的商品；成交後佣金只依被分享商品金額計算，並自動從訂單分帳。
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            啟用分享推廣
          </label>
          <div>
            <Label htmlFor="default-rate">預設佣金 (%)</Label>
            <Input
              id="default-rate"
              type="number"
              min={5}
              max={30}
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              className="mt-1 w-28"
            />
          </div>
          <Button type="button" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">可分享商品</h2>
        <p className="mt-1 text-sm text-gray-500">勾選允許分享的商品；可為單品設定覆寫佣金（留空則用預設）。</p>

        {published.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">尚無已上架商品</p>
        ) : (
          <div className="mt-4 space-y-3">
            {published.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={product.share_enabled}
                    onChange={(e) => void toggleProduct(product, e.target.checked)}
                    disabled={!enabled}
                  />
                  <span className="truncate font-medium">{product.name}</span>
                  <span className="text-gray-500">HK${Number(product.price).toFixed(2)}</span>
                </label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">佣金%</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    placeholder={defaultRate}
                    disabled={!enabled || !product.share_enabled}
                    defaultValue={
                      product.commission_rate != null
                        ? String(Math.round(product.commission_rate * 100))
                        : ''
                    }
                    onBlur={(e) => void updateProductRate(product, e.target.value)}
                    className="h-9 w-20"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
