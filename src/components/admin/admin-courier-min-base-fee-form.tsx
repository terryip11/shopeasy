'use client';



import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';



type Props = {

  initialFood: number;

  initialParcel: number;

  platformFeePercent: number;

};



export function AdminCourierMinBaseFeeForm({

  initialFood,

  initialParcel,

  platformFeePercent,

}: Props) {

  const router = useRouter();

  const [food, setFood] = useState(String(initialFood));

  const [parcel, setParcel] = useState(String(initialParcel));

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');



  const save = async (e: React.FormEvent) => {

    e.preventDefault();

    const foodFee = Number(food);

    const parcelFee = Number(parcel);

    if (!Number.isFinite(foodFee) || foodFee < 0) {

      setError('請輸入有效的送餐最低工資');

      return;

    }

    if (!Number.isFinite(parcelFee) || parcelFee < 0) {

      setError('請輸入有效的送貨最低工資');

      return;

    }



    setSaving(true);

    setError('');

    setMessage('');



    const res = await fetch('/api/admin/courier-min-base-fee', {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ food: foodFee, parcel: parcelFee }),

    });

    const data = await res.json();

    setSaving(false);



    if (!res.ok) {

      setError(data.error || '儲存失敗');

      return;

    }

    setMessage('已更新最低基本工資');

    router.refresh();

  };



  const previewNet = (base: number) => {

    const p = platformFeePercent;

    if (!Number.isFinite(p) || p <= 0) return base;

    return Math.round(base * (1 - p / 100) * 100) / 100;

  };



  return (

    <form onSubmit={save} className="space-y-6">

      <p className="text-sm text-gray-500">

        商家或商品設定的配送員工資<strong>不得低於</strong>此金額；若低於保底，系統將以此計算配送員基本收入與商家配送成本。設為

        HK$0 表示不啟用保底。

      </p>



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">

        <div>

          <Label htmlFor="min-fee-food">{JOB_TYPE_LABELS.food}最低基本工資</Label>

          <div className="mt-2 flex items-center gap-2">

            <Input

              id="min-fee-food"

              type="number"

              min={0}

              step={1}

              value={food}

              onChange={(e) => setFood(e.target.value)}

            />

            <span className="text-sm text-gray-500 shrink-0">HKD</span>

          </div>

        </div>

        <div>

          <Label htmlFor="min-fee-parcel">{JOB_TYPE_LABELS.parcel}最低基本工資</Label>

          <div className="mt-2 flex items-center gap-2">

            <Input

              id="min-fee-parcel"

              type="number"

              min={0}

              step={1}

              value={parcel}

              onChange={(e) => setParcel(e.target.value)}

            />

            <span className="text-sm text-gray-500 shrink-0">HKD</span>

          </div>

        </div>

      </div>



      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">

        <p className="font-medium text-gray-900 dark:text-white">試算（不含高評加價）</p>

        <p className="mt-2 text-gray-600 dark:text-gray-400">

          商家設 HK$15、保底 HK${food || 0} → 基本工資以 HK${Math.max(Number(food) || 0, 15)} 計 → 配送員實收約

          HK${previewNet(Math.max(Number(food) || 0, 15))}（抽成 {platformFeePercent}%）

        </p>

        <p className="mt-1 text-xs text-gray-500">僅影響尚未接單鎖定快照的任務；已接單訂單維持原金額。</p>

      </div>



      {error && <p className="text-sm text-red-600">{error}</p>}

      {message && <p className="text-sm text-green-600">{message}</p>}



      <Button type="submit" disabled={saving}>

        {saving ? '儲存中...' : '儲存最低工資'}

      </Button>

    </form>

  );

}

