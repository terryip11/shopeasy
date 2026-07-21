'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LANDING_VARIANT_META,
  LANDING_VARIANTS,
  type LandingVariantId,
} from '@/lib/marketing/landing-theme-types';

type Props = {
  initialVariant: LandingVariantId;
};

export function AdminLandingVariantPicker({ initialVariant }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<LandingVariantId>(initialVariant);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (variant: LandingVariantId) => {
    setSelected(variant);
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/landing-variant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setSelected(data.variant as LandingVariantId);
      setMessage(`已套用「${LANDING_VARIANT_META[data.variant as LandingVariantId].name}」`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {LANDING_VARIANTS.map((id) => {
          const meta = LANDING_VARIANT_META[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              disabled={saving}
              onClick={() => void save(id)}
              className={`group overflow-hidden rounded-2xl border text-left transition ${
                active
                  ? 'border-orange-500 ring-2 ring-orange-500/30'
                  : 'border-gray-200 hover:border-orange-300 dark:border-gray-700'
              }`}
            >
              <div
                className="relative h-36 bg-cover bg-center"
                style={{ backgroundImage: `url('${meta.heroImage}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-lg font-semibold text-white">{meta.name}</p>
                  <p className="text-xs text-white/80">{meta.tagline}</p>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
                    <Check className="h-3.5 w-3.5" />
                    使用中
                  </span>
                )}
              </div>
              <div className="space-y-3 bg-white p-4 dark:bg-gray-900">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {meta.description}
                </p>
                <div className="flex items-center gap-2">
                  {meta.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            預覽首頁
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/about" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            預覽關於頁
          </a>
        </Button>
        {saving && <span className="text-sm text-gray-500">儲存中...</span>}
        {message && <span className="text-sm text-green-600">{message}</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
