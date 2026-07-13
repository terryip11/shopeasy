'use client';

import { Share2 } from 'lucide-react';
import { useCallback, useState } from 'react';

type Props = {
  storeName: string;
  className?: string;
};

export function StoreShareButton({ storeName, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = `${storeName}｜ShopEasy`;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* user cancelled or unsupported */
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [storeName]);

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 active:bg-gray-100 dark:text-gray-200 dark:active:bg-gray-800 ${className}`}
      aria-label={copied ? '已複製連結' : '分享店鋪'}
      title={copied ? '已複製連結' : '分享店鋪'}
    >
      <Share2 className="h-5 w-5" />
      {copied && (
        <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] text-white">
          已複製
        </span>
      )}
    </button>
  );
}
