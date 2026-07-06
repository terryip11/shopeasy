'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_PLATFORM_FEE_RATE,
  STRIPE_FEE_FIXED_HKD,
  STRIPE_FEE_PERCENT,
  roundMoney,
} from '@/lib/finance/config';

type Props = {
  initialFoodFee: number;
  initialParcelFee: number;
};

function estimateMerchantCashflow(gmv: number, courierFee: number) {
  const stripeFee = roundMoney(gmv * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_HKD);
  const platformFee = roundMoney(gmv * DEFAULT_PLATFORM_FEE_RATE);
  const afterFees = roundMoney(gmv - stripeFee - platformFee);
  const netAfterDelivery = roundMoney(afterFees - courierFee);
  return { stripeFee, platformFee, afterFees, netAfterDelivery };
}

function CourierFeeProfitHint({ foodFee, parcelFee }: { foodFee: number; parcelFee: number }) {
  const examples = useMemo(() => {
    const gmvs = [10, 50, 100];
    return gmvs.map((gmv) => ({
      gmv,
      food: estimateMerchantCashflow(gmv, foodFee),
      parcel: estimateMerchantCashflow(gmv, parcelFee),
    }));
  }, [foodFee, parcelFee]);

  const lowTicketRisk = parcelFee > 10 || foodFee > 10;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-900/10">
      <p className="font-medium text-amber-900 dark:text-amber-200">損益試算（信用卡付款、普通方案）</p>
      <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
        實際落袋 ≈ 訂單金額 − Stripe 手續費 − 平台服務費 − 配送員工資。低價商品若工資過高，每送一單可能虧損。
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-xs">
          <thead>
            <tr className="text-left text-amber-800/80 dark:text-amber-400/80">
              <th className="pb-2 pr-3 font-medium">訂單金額</th>
              <th className="pb-2 pr-3 font-medium">送餐後淨額</th>
              <th className="pb-2 font-medium">送貨後淨額</th>
            </tr>
          </thead>
          <tbody className="text-amber-950 dark:text-amber-100">
            {examples.map((row) => (
              <tr key={row.gmv}>
                <td className="py-1 pr-3">HK${row.gmv}</td>
                <td className={`py-1 pr-3 ${row.food.netAfterDelivery < 0 ? 'font-semibold text-red-600' : ''}`}>
                  {row.food.netAfterDelivery >= 0 ? '+' : ''}
                  {row.food.netAfterDelivery.toFixed(2)}
                </td>
                <td className={`py-1 ${row.parcel.netAfterDelivery < 0 ? 'font-semibold text-red-600' : ''}`}>
                  {row.parcel.netAfterDelivery >= 0 ? '+' : ''}
                  {row.parcel.netAfterDelivery.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lowTicketRisk && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-800 dark:text-amber-300">
          <li>低價商品請酌量下調工資，或設定較高的起送金額</li>
          <li>亦可考慮讓買家付運費（功能規劃中）或改為店內自取</li>
        </ul>
      )}
    </div>
  );
}

export function MerchantCourierFeesForm({ initialFoodFee, initialParcelFee }: Props) {
  const router = useRouter();
  const [foodFee, setFoodFee] = useState(String(initialFoodFee));
  const [parcelFee, setParcelFee] = useState(String(initialParcelFee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    const food = Number(foodFee);
    const parcel = Number(parcelFee);
    if (!Number.isFinite(food) || food < 0) {
      setError('送餐工資請輸入有效金額');
      return;
    }
    if (!Number.isFinite(parcel) || parcel < 0) {
      setError('送貨工資請輸入有效金額');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/merchant/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courier_fee_food: food,
        courier_fee_parcel: parcel,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || '儲存失敗');
      return;
    }
    setMessage('已儲存配送員工資設定');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        配送員每完成一單可獲得以下<strong className="font-medium text-gray-700 dark:text-gray-300">預設</strong>工資（各商品可另行設定）。由商家額外支付
        （不會自動從訂單收款中扣除，但會記入財務「配送成本」）。請依商品售價與毛利自行調整，預設
        HK$25／35 僅供參考。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="courier-fee-food">送餐工資（每單）</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              id="courier-fee-food"
              type="number"
              min={0}
              step={1}
              value={foodFee}
              onChange={(e) => setFoodFee(e.target.value)}
            />
            <span className="text-sm text-gray-500 shrink-0">HKD</span>
          </div>
        </div>
        <div>
          <Label htmlFor="courier-fee-parcel">送貨工資（每單）</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              id="courier-fee-parcel"
              type="number"
              min={0}
              step={1}
              value={parcelFee}
              onChange={(e) => setParcelFee(e.target.value)}
            />
            <span className="text-sm text-gray-500 shrink-0">HKD</span>
          </div>
        </div>
      </div>
      <CourierFeeProfitHint
        foodFee={Number(foodFee) || 0}
        parcelFee={Number(parcelFee) || 0}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? '儲存中...' : '儲存配送員工資'}
      </Button>
    </div>
  );
}
