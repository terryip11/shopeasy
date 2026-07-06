'use client';



import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';

import {

  BUSINESS_TYPE_LABELS,

  MERCHANT_BUSINESS_TYPES,

  type MerchantBusinessType,

} from '@/lib/merchant/business-type';



type Props = {

  initialBusinessType: MerchantBusinessType;

};



export function MerchantBusinessTypeForm({ initialBusinessType }: Props) {

  const router = useRouter();

  const [businessType, setBusinessType] = useState<MerchantBusinessType>(initialBusinessType);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');



  const save = async () => {

    setSaving(true);

    setError('');

    setMessage('');



    const res = await fetch('/api/merchant/settings', {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ business_type: businessType }),

    });

    const data = await res.json();

    setSaving(false);



    if (!res.ok) {

      setError(data.error || '儲存失敗');

      return;

    }

    setMessage('已儲存業務類型設定');

    router.refresh();

  };



  return (

    <div className="space-y-4 border-b pb-6">

      <div>

        <p className="text-sm font-medium text-gray-900 dark:text-white">業務類型</p>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">

          決定買家付款後自動建立的配送任務類型，以及手動建單時的預設選項。取件地址會自動帶入公司營業地址。

        </p>

      </div>

      <div className="flex flex-col gap-2 sm:flex-row">

        {MERCHANT_BUSINESS_TYPES.map((type) => (

          <button

            key={type}

            type="button"

            onClick={() => setBusinessType(type)}

            className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${

              businessType === type

                ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'

                : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'

            }`}

          >

            <span className="font-medium">{BUSINESS_TYPE_LABELS[type]}</span>

            <span className="mt-1 block text-xs opacity-80">

              {type === 'food' ? '預設外賣配送（送餐員）' : '預設貨物配送（送貨員）'}

            </span>

          </button>

        ))}

      </div>

      <div className="sr-only">

        <Label htmlFor="business-type">業務類型</Label>

      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="button" disabled={saving} onClick={() => void save()}>

        {saving ? '儲存中...' : '儲存業務類型'}

      </Button>

    </div>

  );

}

