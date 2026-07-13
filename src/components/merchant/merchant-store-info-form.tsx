'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { useMerchantBranding } from '@/components/merchant/merchant-branding-provider';
import {
  normalizeStoreThemeColor,
  STORE_THEME_PRESETS,
} from '@/lib/merchant/store-theme';

type MerchantStoreInfoFormProps = {
  initialName: string;
  initialSlug: string;
  initialLogoUrl: string | null;
  initialTagline: string | null;
  initialDescription: string | null;
  initialBannerUrl: string | null;
  initialThemeColor: string | null;
  storeUrl: string;
};

async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('請上傳圖片檔案（JPG、PNG 等）');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('圖片大小不可超過 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || '上傳失敗');
  }
  if (!data.publicUrl) {
    throw new Error('上傳成功但未取得圖片網址');
  }

  return normalizeR2ImageUrl(data.publicUrl) ?? data.publicUrl;
}

function ImageUploadField({
  label,
  hint,
  imageUrl,
  uploading,
  disabled,
  onUpload,
  onRemove,
  onLoadError,
  loadError,
  aspect = 'square',
}: {
  label: string;
  hint: string;
  imageUrl: string | null;
  uploading: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onLoadError: () => void;
  loadError: boolean;
  aspect?: 'square' | 'banner';
}) {
  const previewClass =
    aspect === 'banner'
      ? 'h-24 w-full rounded-xl'
      : 'h-24 w-24 rounded-2xl';

  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      <div className="mt-3 space-y-3">
        {imageUrl && (
          <div className={`relative overflow-hidden border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 ${previewClass}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={label}
              className="h-full w-full object-cover"
              onError={onLoadError}
              onLoad={() => {}}
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              aria-label={`移除${label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div
          className={`relative rounded-xl border-2 border-dashed p-4 transition-colors ${
            imageUrl
              ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
              : 'border-gray-200 hover:border-orange-300 dark:border-gray-700'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <div className="pointer-events-none flex items-center gap-3">
            {imageUrl ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
            ) : (
              <Upload className="h-6 w-6 shrink-0 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {uploading ? '上傳中...' : imageUrl ? `點擊更換${label}` : `點擊上傳${label}`}
              </p>
              <p className="text-xs text-gray-500">JPG、PNG，最大 5MB</p>
            </div>
          </div>
        </div>
      </div>
      {loadError && (
        <p className="mt-2 text-xs text-amber-600">
          圖片無法載入。請確認 R2 公開網址設定正確後重新上傳。
        </p>
      )}
    </div>
  );
}

export function MerchantStoreInfoForm({
  initialName,
  initialSlug,
  initialLogoUrl,
  initialTagline,
  initialDescription,
  initialBannerUrl,
  initialThemeColor,
  storeUrl,
}: MerchantStoreInfoFormProps) {
  const router = useRouter();
  const { setLogoUrl: setBrandingLogo, refreshBranding } = useMerchantBranding();
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [themeColor, setThemeColor] = useState(() =>
    normalizeStoreThemeColor(initialThemeColor)
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(() => normalizeR2ImageUrl(initialLogoUrl));
  const [bannerUrl, setBannerUrl] = useState<string | null>(() =>
    normalizeR2ImageUrl(initialBannerUrl)
  );
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(initialName);
    setTagline(initialTagline ?? '');
    setDescription(initialDescription ?? '');
    setThemeColor(normalizeStoreThemeColor(initialThemeColor));
    setLogoUrl(normalizeR2ImageUrl(initialLogoUrl));
    setBannerUrl(normalizeR2ImageUrl(initialBannerUrl));
    setLogoLoadError(false);
    setBannerLoadError(false);
  }, [
    initialName,
    initialTagline,
    initialDescription,
    initialThemeColor,
    initialLogoUrl,
    initialBannerUrl,
  ]);

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setLogoUrl(url);
      setBrandingLogo(url);
      setLogoLoadError(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setBannerUrl(url);
      setBannerLoadError(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/merchant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          logo_url: logoUrl,
          banner_url: bannerUrl,
          store_tagline: tagline.trim() || null,
          store_description: description.trim() || null,
          theme_color: themeColor,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '儲存失敗');
      }

      setMessage('已儲存店鋪設定');
      setBrandingLogo(normalizeR2ImageUrl(logoUrl));
      await refreshBranding();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const uploading = uploadingLogo || uploadingBanner;

  return (
    <div className="space-y-6">
      <ImageUploadField
        label="店鋪 Logo"
        hint="建議正方形、至少 200×200 像素"
        imageUrl={logoUrl}
        uploading={uploadingLogo}
        disabled={saving}
        onUpload={(file) => void handleLogoUpload(file)}
        onRemove={() => {
          setLogoUrl(null);
          setBrandingLogo(null);
        }}
        onLoadError={() => setLogoLoadError(true)}
        loadError={logoLoadError}
      />

      <ImageUploadField
        label="店鋪橫幅"
        hint="建議寬橫圖（例如 1200×400），用於公開店鋪頁頂部"
        imageUrl={bannerUrl}
        uploading={uploadingBanner}
        disabled={saving}
        onUpload={(file) => void handleBannerUpload(file)}
        onRemove={() => setBannerUrl(null)}
        onLoadError={() => setBannerLoadError(true)}
        loadError={bannerLoadError}
        aspect="banner"
      />

      <div className="space-y-4">
        <div>
          <Label htmlFor="store-name">店鋪名稱</Label>
          <Input
            id="store-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="輸入店鋪名稱"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="store-tagline">店鋪標語</Label>
          <Input
            id="store-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="一句話介紹您的店（選填）"
            maxLength={120}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="store-description">店鋪簡介</Label>
          <textarea
            id="store-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="介紹您的品牌故事、特色商品或服務（選填）"
            rows={4}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
          />
          <p className="mt-1 text-xs text-gray-500">{description.length}/500</p>
        </div>

        <div>
          <Label>店鋪主題色</Label>
          <p className="mt-1 text-xs text-gray-500">用於公開店鋪頁的按鈕與強調色</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STORE_THEME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setThemeColor(preset.value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  themeColor === preset.value
                    ? 'border-gray-900 ring-2 ring-gray-900/20 dark:border-white dark:ring-white/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: preset.value }}
                />
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-transparent p-1"
              aria-label="自訂主題色"
            />
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(normalizeStoreThemeColor(e.target.value))}
              className="max-w-[8rem] font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store-slug">店鋪連結</Label>
          <div className="flex h-10 w-full overflow-hidden rounded-xl border border-input bg-background opacity-70">
            <span className="inline-flex shrink-0 items-center border-r border-input bg-gray-50 px-3 text-sm text-gray-500 dark:bg-gray-800/50">
              /stores/
            </span>
            <input
              id="store-slug"
              value={initialSlug}
              readOnly
              className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
            />
          </div>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-gray-50 px-3 dark:bg-gray-800/50">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              URL
            </div>
            <span className="truncate font-mono text-sm text-gray-600 dark:text-gray-300">{storeUrl}</span>
          </div>
          <p className="text-xs text-gray-500">連結預覽：買家可透過此網址瀏覽您的店鋪</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={saving || uploading || !name.trim()}>
          {saving ? '儲存中...' : '儲存店鋪設定'}
        </Button>
      </div>
    </div>
  );
}
