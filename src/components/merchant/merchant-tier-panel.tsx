'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, ArrowUpCircle, Calendar, Banknote } from 'lucide-react';
import {
  MERCHANT_TIER_LABELS,
  MERCHANT_TIER_LIMITS,
  type MerchantTier,
  type TierMonthlyPrices,
  type TierLimitsMap,
} from '@/lib/merchant/tier-config';
import type { MerchantTierInfo } from '@/lib/merchant/tiers';
import type { PlatformPayoutSettings } from '@/lib/finance/platform-payout-types';

const TIER_BADGE_STYLES: Record<MerchantTier, string> = {
  basic: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

type PendingUpgrade = {
  id: string;
  requested_tier: MerchantTier;
  note: string | null;
  applied_at: string;
  status: string;
};

type Props = {
  initial: MerchantTierInfo;
  monthlyPrices: TierMonthlyPrices;
  showUpgradeSuccess?: boolean;
  stripePaymentsEnabled?: boolean;
  platformPayout?: PlatformPayoutSettings | null;
  pendingUpgrade?: PendingUpgrade | null;
  tierLimits?: TierLimitsMap;
};

export function MerchantTierPanel({
  initial,
  monthlyPrices,
  showUpgradeSuccess,
  stripePaymentsEnabled = false,
  platformPayout = null,
  pendingUpgrade = null,
  tierLimits,
}: Props) {
  const [info, setInfo] = useState(initial);
  const [pending, setPending] = useState(pendingUpgrade);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MerchantTier | ''>('');
  const [fpsNote, setFpsNote] = useState('');
  const [error, setError] = useState('');

  const [syncing, setSyncing] = useState(false);

  const fpsConfigured = Boolean(platformPayout?.fpsId?.trim());

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

    const price = monthlyPrices[selectedTier as 'premium' | 'vip'];
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

  const handleFpsReportPaid = async () => {
    if (!selectedTier || selectedTier === 'basic') {
      setError('請選擇要升級的等級');
      return;
    }
    if (!fpsConfigured) {
      setError('平台尚未設定 FPS 收款資料');
      return;
    }

    const price = monthlyPrices[selectedTier as 'premium' | 'vip'];
    if (
      !confirm(
        `確認已用 FPS 轉帳 HK$${price} 訂閱「${MERCHANT_TIER_LABELS[selectedTier]}」？提交後將等候管理員核對。`
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/merchant/tier-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requested_tier: selectedTier,
        note: fpsNote.trim() || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '提交失敗');
      return;
    }

    setPending({
      id: data.upgrade.id,
      requested_tier: data.upgrade.requested_tier,
      note: data.upgrade.note ?? (fpsNote.trim() || null),
      applied_at: data.upgrade.applied_at,
      status: 'pending',
    });
    setShowForm(false);
    setSelectedTier('');
    setFpsNote('');
  };

  const handleDevActivate = async () => {
    if (!selectedTier || selectedTier === 'basic') {
      setError('請選擇要升級的等級');
      return;
    }
    if (!confirm(`開發模式：直接升級為「${MERCHANT_TIER_LABELS[selectedTier]}」？（不經收款）`)) {
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
  const displayLimits = tierLimits ?? MERCHANT_TIER_LIMITS;

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

        {info.tier !== 'vip' && !pending && (
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

      {pending && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="font-medium">
            已提交升級至「{MERCHANT_TIER_LABELS[pending.requested_tier]}」，等候管理員核對 FPS
            轉帳。
          </p>
          {pending.note && <p className="mt-1 text-xs opacity-80">備註：{pending.note}</p>}
          <p className="mt-1 text-xs opacity-70">
            提交時間：{new Date(pending.applied_at).toLocaleString('zh-HK')}
          </p>
        </div>
      )}

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
                {monthlyPrices[tier as 'premium' | 'vip']}/月
              </Button>
            ))}
          </div>

          {stripePaymentsEnabled ? (
            <p className="text-xs text-gray-500">
              透過 Stripe 安全付款，成功後自動升級，無需人工審核。取消訂閱後將於本期結束降回普通商家。
            </p>
          ) : (
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <p className="font-medium text-gray-800 dark:text-gray-200">FPS 轉帳升級（半自動）</p>
              {fpsConfigured && platformPayout ? (
                <>
                  <dl className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">收款人</dt>
                      <dd className="font-medium">{platformPayout.accountHolder || '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">FPS</dt>
                      <dd className="font-mono font-medium">{platformPayout.fpsId}</dd>
                    </div>
                    {selectedTier && selectedTier !== 'basic' && (
                      <div className="flex gap-2">
                        <dt className="w-16 shrink-0 text-gray-500">金額</dt>
                        <dd className="font-medium">
                          HK${monthlyPrices[selectedTier as 'premium' | 'vip']}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {platformPayout.instructions && (
                    <p className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">
                      {platformPayout.instructions}
                    </p>
                  )}
                  <label className="block text-xs text-gray-600 dark:text-gray-300">
                    轉帳備註（選填）
                    <input
                      type="text"
                      value={fpsNote}
                      onChange={(e) => setFpsNote(e.target.value)}
                      maxLength={500}
                      placeholder="例如轉帳時間／參考編號"
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                  </label>
                  <p className="text-xs text-gray-500">
                    請先轉帳後再按「我已付款」。管理員核對到帳後會開通等級（約一個月）。
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  平台尚未設定 FPS 收款資料，暫時無法升級，請稍後再試或聯絡客服。
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {stripePaymentsEnabled ? (
              <Button onClick={handlePayUpgrade} disabled={loading} className="gap-2">
                <CreditCard className="h-4 w-4" />
                {loading ? '跳轉付款中...' : '前往付款'}
              </Button>
            ) : (
              <Button
                onClick={handleFpsReportPaid}
                disabled={loading || !fpsConfigured}
                className="gap-2"
              >
                <Banknote className="h-4 w-4" />
                {loading ? '提交中...' : '我已付款'}
              </Button>
            )}
            {showDevActivate && (
              <Button
                variant="outline"
                onClick={handleDevActivate}
                disabled={loading}
                className="border-amber-300 text-amber-700"
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
          <span className="font-medium text-gray-700 dark:text-gray-300">普通</span> · 免費 ·{' '}
          {displayLimits.basic.maxProducts} 商品 · {displayLimits.basic.maxImagesPerProduct} 圖
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-900/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">高級</span> · HK$
          {monthlyPrices.premium}/月 · {displayLimits.premium.maxProducts} 商品 ·{' '}
          {displayLimits.premium.maxImagesPerProduct} 圖
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-gray-900/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">尊貴</span> · HK$
          {monthlyPrices.vip}/月 · {displayLimits.vip.maxProducts} 商品 ·{' '}
          {displayLimits.vip.maxImagesPerProduct} 圖
        </div>
      </div>
    </div>
  );
}
