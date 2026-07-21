/**
 * 商品卡片元件
 */

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  merchantName?: string;
  categoryName?: string;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  images,
  merchantName,
  categoryName,
}: ProductCardProps) {
  const imageUrl = images?.[0] || '/next.svg';

  return (
    <div className="group relative rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-700">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        
        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:bg-white hover:text-red-500 transition-colors dark:bg-gray-800/90 dark:text-gray-300"
            aria-label="收藏"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        {/* Category Badge */}
        {categoryName && (
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800/90 dark:text-gray-200">
              {categoryName}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate dark:text-white">
              {name}
            </h3>
            {merchantName && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {merchantName}
              </p>
            )}
          </div>
        </div>

        {description && (
          <p className="mt-1.5 hidden text-xs text-gray-500 line-clamp-2 sm:block dark:text-gray-400">
            {description}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-orange-500 sm:text-lg">
              ${price.toFixed(2)}
            </span>
          </div>

          <Link
            href={`/products/${id}`}
            className="card-action-btn w-full justify-center bg-gray-900 text-white hover:bg-orange-500 sm:w-auto dark:bg-white dark:text-gray-900 dark:hover:bg-orange-500 dark:hover:text-white"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            購買
          </Link>
        </div>
      </div>
    </div>
  );
}

