'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, ArrowUpCircle, Calendar } from 'lucide-react';
import {
  MERCHANT_TIER_LABELS,
  TIER_MONTHLY_PRICE_HKD,
  type MerchantTier,
} from '@/lib/merchant/tier-config';
import type { MerchantTierInfo } from '@/lib/merchant/tiers';

const TIER_BADGE_STYLES: Record<MerchantTier, string> = {
  basic: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

type Props = {
  initial: MerchantTierInfo;
  showUpgradeSuccess?: boolean;
  stripePaymentsEnabled?: boolean;
};

export function MerchantTierPanel({
  initial,
  showUpgradeSuccess,
  stripePaymentsEnabled = false,
}: Props) {
  const [info, setInfo] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MerchantTier | ''>('');
  const [error, setError] = useState('');

  const [syncing, setSyncing] = useState(false);

  const handleSyncPayment = async () => {
    setSyncing(true);
    setError('');

    const res = await fetch('/api/merchant/tier-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync: true }),
    });

    const data = await res.json();
    setSyncing(false);

    if (!res.ok) {
      setError(data.error || '同步失敗');
      return;
    }

    window.location.href = '/dashboard';
  };

  const productUsage = `${info.productCount} / ${info.limits.maxProducts ?? '∞'} 件`;

  const handlePayUpgrade = async () => {
    if (!selectedTier || selectedTier === 'basic') {
      setError('請選擇要升級的等級');
      return;
    }

    const price = TIER_MONTHLY_PRICE_HKD[selectedTier as 'premium' | 'vip'];
    if (
      !confirm(
        `確認訂閱「${MERCHANT_TIER_LABELS[selectedTier]}」？月費 HK$${price}，付款成功後立即生效。`
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/merchant/tier-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requested_tier: selectedTier }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '無法建立付款');
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    setError('未取得付款連結');
  };

  const handleDevActivate = async () => {
    if (!selectedTier || selectedTier === 'basic') {
      setError('請選擇要升級的等級');
      return;
    }
    if (!confirm(`開發模式：直接升級為「${MERCHANT_TIER_LABELS[selectedTier]}」？（不經 Stripe 收款）`)) {
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/dev/merchant/tier-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requested_tier: selectedTier }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '升級失敗');
      return;
    }

    setShowForm(false);
    setSelectedTier('');
    window.location.reload();
  };

  const showDevActivate = process.env.NODE_ENV === 'development';

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm dark:border-orange-800/50 dark:from-orange-950/30 dark:to-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">商家等級</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE_STYLES[info.tier]}`}
            >
              {info.tierLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            商品數量：{productUsage} · 每件最多 {info.limits.maxImagesPerProduct} 張圖片
          </p>
          {info.subscription.active && info.subscription.periodEnd && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              訂閱有效期至{' '}
              {new Date(info.subscription.periodEnd).toLocaleDateString('zh-HK')}
            </p>
          )}
        </div>

        {info.tier !== 'vip' && (
          <Button
            className="gap-2"
            onClick={() => setShowForm((v) => !v)}
            disabled={loading || syncing}
          >
            <ArrowUpCircle className="h-4 w-4" />
            升級方案
          </Button>
        )}
      </div>

      {showUpgradeSuccess && info.tier === 'basic' && stripePaymentsEnabled && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20">
          <p>若已付款但等級未更新，請點下方按鈕同步 Stripe 付款記錄。</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 border-amber-400"
            onClick={handleSyncPayment}
            disabled={syncing}
          >
            {syncing ? '同步中...' : '同步付款並升級'}
          </Button>
        </div>
      )}

      {showForm && info.upgradeOptions.length > 0 && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">選擇訂閱方案（月費）</p>
          <div className="flex flex-wrap gap-2">
            {info.upgradeOptions.map((tier) => (
              <Button
                key={tier}
                type="button"
                variant={selectedTier === tier ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTier(tier)}
              >
                {MERCHANT_TIER_LABELS[tier]} · HK$
                {TIER_MONTHLY_PRICE_HKD[tier as 'premium' | 'vip']}/月
              </Button>
            ))}
          </div>
          {!stripePaymentsEnabled && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              線上訂閱付款即將開放（待 Stripe 正式開通）。目前請使用普通商家方案，或於開發環境使用「直接升級」測試。
            </p>
          )}
          <p className="text-xs text-gray-500">
            {stripePaymentsEnabled
              ? '透過 Stripe 安全付款，成功後自動升級，無需人工審核。取消訂閱後將於本期結束降回普通商家。'
              : '方案升級功能即將開放，敬請期待。'}
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {stripePaymentsEnabled ? (
              <Button onClick={handlePayUpgrade} disabled={loading} className="gap-2">
                <CreditCard className="h-4 w-4" />
                {loading ? '跳轉付款中...' : '前往付款'}
              </Button>
            ) : (
              <Button disabled className="gap-2" title="即將開放">
                <CreditCard className="h-4 w-4" />
                即將開放
              </Button>
            )}
            {showDevActivate && (
              <Button
                variant="outline"
                onClick={handleDevActivate}
                disabled={loading}
                className="text-amber-700 border-amber-300"
              >
                開發模式直接升級
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={loading}>
              取消
            </Button>
          </div>
        </div>
      )}

      {info.tier === 'basic' && !showUpgradeSuccess && stripePaymentsEnabled && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleSyncPayment}
            disabled={syncing}
            className="text-xs text-orange-600 hover:underline disabled:opacity-50"
          >
            {syncing ? '同步中...' : '已付款但未升級？點此同步'}
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
        <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-900/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">普通</span> · 免費 · 3 商品 · 2 圖
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-900/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">高級</span> · HK$88/月 · 20 商品 · 5 圖
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-900/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">尊貴</span> · HK$128/月 · 50 商品 · 8 圖
        </div>
      </div>
    </div>
  );
}
