'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { useMerchantBranding } from '@/components/merchant/merchant-branding-provider';

type MerchantStoreInfoFormProps = {
  initialName: string;
  initialSlug: string;
  initialLogoUrl: string | null;
  storeUrl: string;
};

export function MerchantStoreInfoForm({
  initialName,
  initialSlug,
  initialLogoUrl,
  storeUrl,
}: MerchantStoreInfoFormProps) {
  const router = useRouter();
  const { setLogoUrl: setBrandingLogo, refreshBranding } = useMerchantBranding();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => normalizeR2ImageUrl(initialLogoUrl));
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLogoUrl(normalizeR2ImageUrl(initialLogoUrl));
    setLogoLoadError(false);
  }, [initialLogoUrl]);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('請上傳圖片檔案（JPG、PNG 等）');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo 大小不可超過 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
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

      const normalized = normalizeR2ImageUrl(data.publicUrl);
      setLogoUrl(normalized);
      setBrandingLogo(normalized);
      setLogoLoadError(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <Label>店鋪 Logo</Label>
        <p className="mt-1 text-xs text-gray-500">上傳 1 張圖片作為店鋪標誌，建議正方形、至少 200×200 像素</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            {logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="店鋪 Logo"
                  className="h-full w-full object-cover"
                  onError={() => setLogoLoadError(true)}
                  onLoad={() => setLogoLoadError(false)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    setBrandingLogo(null);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  aria-label="移除 Logo"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <Upload className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="min-w-[12rem] flex-1">
            <div
              className={`relative rounded-xl border-2 border-dashed p-4 transition-colors ${
                logoUrl
                  ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                  : 'border-gray-200 hover:border-orange-300 dark:border-gray-700'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                disabled={uploading || saving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogoUpload(file);
                  e.target.value = '';
                }}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <div className="pointer-events-none flex items-center gap-3">
                {logoUrl ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
                ) : (
                  <Upload className="h-6 w-6 shrink-0 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {uploading ? '上傳中...' : logoUrl ? '點擊更換 Logo' : '點擊上傳 Logo'}
                  </p>
                  <p className="text-xs text-gray-500">JPG、PNG，最大 5MB，僅 1 張</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {logoLoadError && (
          <p className="text-xs text-amber-600">
            圖片無法載入。請到 Cloudflare → R2 → 你的 bucket → 設定 → 啟用「公開開發 URL」，將產生的
            r2.dev 網址填入 .env.local 的 NEXT_PUBLIC_R2_PUBLIC_URL，重啟 dev server 後重新上傳。
          </p>
        )}
      </div>

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
