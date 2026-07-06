'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentUploader } from '@/components/merchant/document-uploader';
import { MERCHANT_DATA_CONSENT_STATEMENT } from '@/lib/merchant/apply';
import { BUSINESS_TYPE_LABELS, MERCHANT_BUSINESS_TYPES } from '@/lib/merchant/business-type';
import type { MerchantBusinessType } from '@/lib/merchant/business-type';

export function MerchantApplyForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [businessType, setBusinessType] = useState<MerchantBusinessType>('retail');
  const [brImageUrl, setBrImageUrl] = useState('');
  const [ciImageUrl, setCiImageUrl] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataConsent) {
      setError('請閱讀並同意個人資料收集聲明');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/merchant/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: slug.toLowerCase(),
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        company_address: companyAddress,
        business_type: businessType,
        br_image_url: brImageUrl,
        ci_image_url: ciImageUrl,
        data_consent: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login?redirect=/merchant/apply');
        return;
      }
      setError(data.error || '申請失敗');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="mt-8 rounded-xl bg-green-50 p-6 text-center dark:bg-green-900/20">
        <p className="font-medium text-green-800 dark:text-green-300">申請已提交！</p>
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          我們將核對您提交的 BR 及 CI 資料，審核需時約 1–3 個工作天。
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-orange-500 hover:underline">
          返回首頁
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">公司資料</h2>
        <div>
          <Label htmlFor="name">店鋪／公司名稱 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1"
            placeholder="例：美好美妝有限公司"
          />
        </div>
        <div>
          <Label htmlFor="slug">店鋪網址代稱 *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            className="mt-1 font-mono"
            placeholder="my-beauty-hk"
          />
          <p className="mt-1 text-xs text-gray-400">shopeasy.com/stores/{slug || 'your-store'}</p>
        </div>
        <div>
          <Label htmlFor="company_address">公司營業地址 *</Label>
          <textarea
            id="company_address"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            required
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            placeholder="香港九龍尖沙咀廣東道 100 號..."
          />
        </div>
        <div>
          <Label>業務類型 *</Label>
          <p className="mt-1 text-xs text-gray-400">
            餐飲店鋪付款後將自動建立外賣配送任務；零售網店則建立貨物配送任務。
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {MERCHANT_BUSINESS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBusinessType(type)}
                className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm ${
                  businessType === type
                    ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                {BUSINESS_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">聯絡人資料</h2>
        <div>
          <Label htmlFor="contact_name">聯絡人姓名 *</Label>
          <Input
            id="contact_name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            className="mt-1"
            placeholder="陳大文"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_phone">聯絡電話 *</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              className="mt-1"
              placeholder="91234567 或 +85291234567"
            />
          </div>
          <div>
            <Label htmlFor="contact_email">聯絡電郵 *</Label>
            <Input
              id="contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="contact@company.com.hk"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">香港公司證明文件</h2>
        <p className="text-sm text-gray-500">
          請上傳清晰、完整且未過期的證明文件影像，以供平台核實。
        </p>
        <DocumentUploader
          label="商業登記證（BR）"
          value={brImageUrl}
          onUpload={setBrImageUrl}
          required
        />
        <DocumentUploader
          label="公司註冊證明書（CI）"
          value={ciImageUrl}
          onUpload={setCiImageUrl}
          required
        />
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">個人資料收集聲明</h2>
        <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-600 whitespace-pre-wrap dark:bg-gray-800 dark:text-gray-400">
          {MERCHANT_DATA_CONSENT_STATEMENT}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={dataConsent}
            onChange={(e) => setDataConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            本人已閱讀並明白上述個人資料收集聲明，並同意 ShopEasy 按聲明所述目的收集及使用本人及所代表公司之資料。
            <span className="text-red-500"> *</span>
          </span>
        </label>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading || !dataConsent}>
        {loading ? '提交中...' : '提交入駐申請'}
      </Button>
    </form>
  );
}
