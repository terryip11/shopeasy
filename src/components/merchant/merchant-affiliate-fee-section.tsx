'use client';

import { useMemo, useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { estimateMerchantAffiliatePayout } from '@/lib/affiliate/commission-base';

type PlatformInfo = {
  platformCutRate: number;
  minCommissionRate: number;
  maxCommissionRate: number;
};

type Props = {
  defaultCommissionPercent: number;
  platformFeeRate: number;
  platform: PlatformInfo;
  stripePaymentsEnabled: boolean;
};

function formatHkd(value: number) {
  return `HK$${value.toFixed(2)}`;
}

function parseAmount(raw: string): number {
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function MerchantAffiliateFeeSection({
  defaultCommissionPercent,
  platformFeeRate,
  platform,
  stripePaymentsEnabled,
}: Props) {
  const [sharedSubtotal, setSharedSubtotal] = useState('100');
  const [otherSubtotal, setOtherSubtotal] = useState('0');
  const [shippingFee, setShippingFee] = useState('30');
  const [commissionPercent, setCommissionPercent] = useState(String(defaultCommissionPercent));
  const [includeStripe, setIncludeStripe] = useState(stripePaymentsEnabled);

  const estimate = useMemo(() => {
    return estimateMerchantAffiliatePayout({
      sharedSubtotal: parseAmount(sharedSubtotal),
      otherSubtotal: parseAmount(otherSubtotal),
      shippingFee: parseAmount(shippingFee),
      commissionRate: parseAmount(commissionPercent) / 100,
      platformFeeRate,
      platformCutOnCommission: platform.platformCutRate,
      includeStripe,
    });
  }, [
    sharedSubtotal,
    otherSubtotal,
    shippingFee,
    commissionPercent,
    platformFeeRate,
    platform.platformCutRate,
    includeStripe,
  ]);

  const showPlatformServiceFee = platformFeeRate > 0;
  const showPlatformCut = platform.platformCutRate > 0;
  const platformFeePercent = Math.round(platformFeeRate * 1000) / 10;
  const platformCutPercent = Math.round(platform.platformCutRate * 100);

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">費用說明</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <strong>分享佣金</strong>
              ：只依「被分享商品」在訂單內的金額計算，同單其他商品不計入佣金基數。由您以
              FPS 直付分享員。
            </li>
            {showPlatformServiceFee && (
              <li>
                <strong>平台服務費</strong>：依整筆訂單 GMV（商品小計 + 運費）×{' '}
                {platformFeePercent}% 收取，與是否分享無關。
              </li>
            )}
            <li>
              <strong>運費(向客戶收取的運費)</strong>
              ：不計入分享佣金
              {showPlatformServiceFee ? '，但會計入 GMV 與平台服務費' : ''}。
            </li>
            {showPlatformCut ? (
              <li>
                分享員實得 = 佣金總額 × (1 − 平台抽成 {platformCutPercent}
                %)；佣金總額由商家負擔。
              </li>
            ) : (
              <li>分享員實得 = 佣金總額（平台不抽分享佣金）；佣金由商家負擔並直付。</li>
            )}
            <li className="text-gray-500">
              試算不含基礎設施分攤
              {stripePaymentsEnabled
                ? '；若使用 Stripe 線上收款，另扣估算卡費（2.9% + HK$2.35）'
                : ''}
              。
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Calculator className="h-4 w-4 text-violet-500" />
          費用試算器
        </div>
        <p className="mt-1 text-xs text-gray-500">
          模擬一筆透過分享連結成交的訂單，預估各項扣除與您實得金額。
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="calc-shared">被分享商品金額 (HK$)</Label>
            <Input
              id="calc-shared"
              type="number"
              min={0}
              step="0.01"
              value={sharedSubtotal}
              onChange={(e) => setSharedSubtotal(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="calc-other">同單其他商品 (HK$)</Label>
            <Input
              id="calc-other"
              type="number"
              min={0}
              step="0.01"
              value={otherSubtotal}
              onChange={(e) => setOtherSubtotal(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="calc-shipping">運費(向客戶收取的運費) (HK$)</Label>
            <Input
              id="calc-shipping"
              type="number"
              min={0}
              step="0.01"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="calc-rate">佣金 (%)</Label>
            <Input
              id="calc-rate"
              type="number"
              min={Math.round(platform.minCommissionRate * 100)}
              max={Math.round(platform.maxCommissionRate * 100)}
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {stripePaymentsEnabled && (
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeStripe}
              onChange={(e) => setIncludeStripe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            含 Stripe 卡費估算
          </label>
        )}

        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <dt className="text-gray-500">訂單 GMV</dt>
            <dd className="font-medium">{formatHkd(estimate.gmv)}</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <dt className="text-gray-500">佣金基數（被分享商品）</dt>
            <dd className="font-medium">{formatHkd(estimate.commissionBase)}</dd>
          </div>
          <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
            <dt className="text-amber-800 dark:text-amber-300">分享佣金（您負擔）</dt>
            <dd className="font-medium text-amber-900 dark:text-amber-200">
              −{formatHkd(estimate.commissionGross)}
            </dd>
          </div>
          <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <dt className="text-gray-500">分享員實得</dt>
            <dd>{formatHkd(estimate.promoterNet)}</dd>
          </div>
          {showPlatformServiceFee && (
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
              <dt className="text-gray-500">平台服務費</dt>
              <dd className="text-red-600 dark:text-red-400">
                −{formatHkd(estimate.platformServiceFee)}
              </dd>
            </div>
          )}
          {includeStripe && (
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
              <dt className="text-gray-500">Stripe 卡費（估算）</dt>
              <dd className="text-red-600 dark:text-red-400">−{formatHkd(estimate.stripeFee)}</dd>
            </div>
          )}
          <div className="flex justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 sm:col-span-2 dark:border-emerald-900 dark:bg-emerald-950/30">
            <dt className="font-medium text-emerald-800 dark:text-emerald-300">預估商家實得</dt>
            <dd className="text-lg font-bold text-emerald-700 dark:text-emerald-200">
              {formatHkd(estimate.merchantNet)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
