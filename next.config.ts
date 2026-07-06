import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

function lanDevOrigins(): string[] {
  const hosts = new Set<string>(['192.168.0.103']);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const { hostname } = new URL(appUrl);
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        hosts.add(hostname);
      }
    } catch {
      /* ignore */
    }
  }
  return [...hosts];
}

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [
    { url: '/~offline', revision },
    { url: '/products', revision },
  ],
});

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
};

export default withSerwist(nextConfig);
