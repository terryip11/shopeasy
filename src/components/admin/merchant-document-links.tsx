'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileImage, X } from 'lucide-react';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { cn } from '@/lib/utils';

type Props = {
  brImageUrl?: string | null;
  ciImageUrl?: string | null;
  className?: string;
};

const DOC_META = {
  br: { short: 'BR', title: '商業登記證（BR）' },
  ci: { short: 'CI', title: '公司註冊證明（CI）' },
} as const;

export function MerchantDocumentLinks({ brImageUrl, ciImageUrl, className }: Props) {
  const br = normalizeR2ImageUrl(brImageUrl);
  const ci = normalizeR2ImageUrl(ciImageUrl);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview, closePreview]);

  const docs = [
    { key: 'br' as const, url: br },
    { key: 'ci' as const, url: ci },
  ].filter((d) => d.url);

  if (docs.length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {docs.map((doc) => (
          <button
            key={doc.key}
            type="button"
            onClick={() =>
              setPreview({ url: doc.url!, title: DOC_META[doc.key].title })
            }
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:text-orange-300 dark:hover:border-orange-600"
          >
            <FileImage className="h-3.5 w-3.5 shrink-0" />
            {DOC_META[doc.key].short}
          </button>
        ))}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={preview.title}
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{preview.title}</p>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-600 hover:underline"
                >
                  新分頁開啟
                </a>
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="關閉預覽"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-3.5rem)] overflow-auto bg-gray-100 p-4 dark:bg-gray-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.title}
                className="mx-auto max-h-[calc(90vh-6rem)] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
