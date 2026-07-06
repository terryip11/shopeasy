/**
 * 手機優先商品卡 — 雙欄瀑布流用
 */

import Link from 'next/link';
import Image from 'next/image';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';

interface MobileProductCardProps {
  id: string;
  name: string;
  price: number;
  images: string[];
  categoryName?: string;
  badge?: string;
}

export function MobileProductCard({
  id,
  name,
  price,
  images,
  categoryName,
  badge,
}: MobileProductCardProps) {
  const raw = images?.[0];
  const imageUrl = normalizeR2ImageUrl(raw) ?? raw ?? '/next.svg';

  return (
    <Link
      href={`/products/${id}`}
      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 active:scale-[0.98] transition-transform dark:bg-gray-900 dark:ring-gray-800"
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {(badge || categoryName) && (
          <div className="absolute left-1.5 top-1.5 flex max-w-[85%] flex-wrap gap-1">
            {badge && (
              <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {badge}
              </span>
            )}
            {categoryName && (
              <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm">
                {categoryName}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-gray-800 dark:text-gray-100">
          {name}
        </h3>
        <div className="mt-auto pt-2">
          <p className="text-base font-bold text-red-500">
            <span className="text-xs font-semibold">HK$</span>
            {price.toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
}
