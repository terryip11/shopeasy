'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Building2, ScanLine, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentUploader } from '@/components/merchant/document-uploader';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { normalizePaymentMethods } from '@/lib/merchant/payment-methods';
import { validatePayoutForMethods, methodHasPayoutConfig, type MerchantPayoutDetails } from '@/lib/merchant/payout';

type Props = {
  initial: MerchantPayoutDetails;
  paymentMethods: string[];
  stripePaymentsEnabled?: boolean;
};

export function MerchantPayoutForm({
  initial,
  paymentMethods,
  stripePaymentsEnabled = false,
}: Props) {
  const router = useRouter();
  const methods = normalizePaymentMethods(paymentMethods);
  const needsBank = methods.includes('bank_transfer');
  const needsFps = methods.includes('fps');
  const needsWechat = methods.includes('wechat_pay');
  const needsAlipay = methods.includes('alipay');

  const [bankName, setBankName] = useState(initial.bankName);
  const [accountHolder, setAccountHolder] = useState(initial.accountHolder);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [fpsId, setFpsId] = useState(initial.fpsId);
  const [wechatId, setWechatId] = useState(initial.wechatId);
  const [wechatQrUrl, setWechatQrUrl] = useState<string | null>(
    () => normalizeR2ImageUrl(initial.wechatQrUrl)
  );
  const [alipayId, setAlipayId] = useState(initial.alipayId);
  const [alipayQrUrl, setAlipayQrUrl] = useState<string | null>(
    () => normalizeR2ImageUrl(initial.alipayQrUrl)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    const payout: MerchantPayoutDetails = {
      bankName,
      accountHolder,
      accountNumber,
      fpsId,
      wechatId,
      wechatQrUrl,
      alipayId,
      alipayQrUrl,
    };
    const methodsToValidate = methods.filter(
      (m) => m !== 'card' && methodHasPayoutConfig(m, payout)
    );
    const validationError = validatePayoutForMethods(methodsToValidate, payout);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/merchant/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payout_bank_name: bankName.trim() || null,
        payout_account_holder: accountHolder.trim() || null,
        payout_account_number: accountNumber.trim() || null,
        payout_fps_id: fpsId.trim() || null,
        payout_wechat_id: wechatId.trim() || null,
        payout_wechat_qr_url: wechatQrUrl,
        payout_alipay_id: alipayId.trim() || null,
        payout_alipay_qr_url: alipayQrUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || '儲存失敗');
      setSaving(false);
      return;
    }

    setMessage('收款資料已更新');
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
        <div className="flex gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              信用卡收款
              {!stripePaymentsEnabled && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  即將開放
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {stripePaymentsEnabled
                ? '客人以信用卡付款時，款項由平台透過 Stripe 代收；無需在此填寫收款帳戶，平台將依結算規則撥付予商家。'
                : '平台 Stripe 線上收款即將開放。開通前請先設定下方轉帳、FPS 或微信／支付寶收款資料。'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-green-600" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            銀行轉帳收款資料
            {needsBank && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        {!needsBank && (
          <p className="text-xs text-gray-500">
            若將來開放銀行轉帳付款，可預先填寫；客人轉帳時會看到以下資料。
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="payout-bank">收款銀行</Label>
            <Input
              id="payout-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="例如：匯豐銀行"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="payout-holder">戶口持有人</Label>
            <Input
              id="payout-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="與銀行戶口一致"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="payout-account">銀行戶口號碼</Label>
            <Input
              id="payout-account"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="請勿含空格"
              className="mt-1"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            轉數快（FPS）收款
            {needsFps && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        {!needsFps && (
          <p className="text-xs text-gray-500">若將來開放轉數快付款，可預先填寫識別碼。</p>
        )}
        <div>
          <Label htmlFor="payout-fps">FPS 識別碼</Label>
          <Input
            id="payout-fps"
            value={fpsId}
            onChange={(e) => setFpsId(e.target.value)}
            placeholder="手機號碼、電郵或 FPS ID"
            className="mt-1"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            微
          </span>
          <h3 className="font-medium text-gray-900 dark:text-white">
            微信支付收款
            {needsWechat && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        <p className="text-xs text-gray-500">
          建議上傳微信「收款碼」截圖，客人下單後可直接掃碼付款。
        </p>
        <DocumentUploader
          label="微信收款碼"
          value={wechatQrUrl ?? undefined}
          onUpload={(url) => setWechatQrUrl(normalizeR2ImageUrl(url))}
          required={needsWechat}
        />
        {wechatQrUrl && (
          <div className="flex justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700">
              <Image
                src={wechatQrUrl}
                alt="微信收款碼預覽"
                fill
                className="object-contain p-2"
                sizes="160px"
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="payout-wechat">微信帳號（選填，備用）</Label>
          <Input
            id="payout-wechat"
            value={wechatId}
            onChange={(e) => setWechatId(e.target.value)}
            placeholder="WeChat ID，無收款碼時可填"
            className="mt-1"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/30 p-4 dark:border-sky-900/40 dark:bg-sky-950/10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            支
          </span>
          <h3 className="font-medium text-gray-900 dark:text-white">
            支付寶收款
            {needsAlipay && <span className="ml-1 text-red-500">*</span>}
          </h3>
        </div>
        <p className="text-xs text-gray-500">
          建議上傳支付寶「個人收款碼」或「商家收款碼」圖片。
        </p>
        <DocumentUploader
          label="支付寶收款碼"
          value={alipayQrUrl ?? undefined}
          onUpload={(url) => setAlipayQrUrl(normalizeR2ImageUrl(url))}
          required={needsAlipay}
        />
        {alipayQrUrl && (
          <div className="flex justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700">
              <Image
                src={alipayQrUrl}
                alt="支付寶收款碼預覽"
                fill
                className="object-contain p-2"
                sizes="160px"
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="payout-alipay">支付寶帳號（選填，備用）</Label>
          <Input
            id="payout-alipay"
            value={alipayId}
            onChange={(e) => setAlipayId(e.target.value)}
            placeholder="手機或電郵，無收款碼時可填"
            className="mt-1"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? '儲存中...' : '儲存收款資料'}
      </Button>
    </div>
  );
}
