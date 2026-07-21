import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

function swcHelperShim(name: 'interop-require-wildcard' | 'interop-require-default') {
  return path.join(process.cwd(), 'src/lib/shims', `${name}.js`);
}

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
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Next 16 dev + webpack：避免 @swc/helpers ESM 與 CJS interop 不相容造成白屏
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const wildcardShim = swcHelperShim('interop-require-wildcard');
      const defaultShim = swcHelperShim('interop-require-default');
      const helpersRoot = path.join(process.cwd(), 'node_modules/@swc/helpers');

      config.resolve ??= {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '@swc/helpers/_/_interop_require_wildcard': wildcardShim,
        '@swc/helpers/_/_interop_require_default': defaultShim,
        [path.join(helpersRoot, 'esm/_interop_require_wildcard.js')]: wildcardShim,
        [path.join(helpersRoot, 'esm/_interop_require_default.js')]: defaultShim,
      };
    }
    return config;
  },
};

export default withSerwist(nextConfig);
