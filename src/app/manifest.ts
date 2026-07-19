import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ShopEasy',
    short_name: 'ShopEasy',
    description: '探索精選好物，發現優質商家，享受便捷購物體驗',
    start_url: '/products',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#f97316',
    lang: 'zh-TW',
    categories: ['shopping', 'food'],
    prefer_related_applications: false,
    related_applications: [
      {
        platform: 'webapp',
        url: '/manifest.webmanifest',
      },
    ],
    icons: [
      {
        src: '/pwa/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/icon-512-maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: '購物首頁',
        short_name: '首頁',
        url: '/products',
        icons: [{ src: '/pwa/icon-192', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '購物車',
        url: '/cart',
        icons: [{ src: '/pwa/icon-192', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '我的訂單',
        url: '/orders',
        icons: [{ src: '/pwa/icon-192', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
