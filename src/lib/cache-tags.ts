/** 跨請求資料快取標籤（搭配 unstable_cache / revalidateTag） */
export const CACHE_TAGS = {
  categories: 'categories',
  landingVariant: 'landing-variant',
  deliveryZones: 'delivery-zones',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
