'use client';

import { useEffect } from 'react';
import { SerwistProvider } from '@serwist/next/react';
import { PwaPushPrompt } from '@/components/pwa/pwa-push-prompt';
import { PwaUpdatePrompt } from '@/components/pwa/pwa-update-prompt';
import { PushSubscriptionSync } from '@/components/pwa/push-subscription-sync';
import { initPwaInstallCapture } from '@/lib/pwa/install';

const isDev = process.env.NODE_ENV === 'development';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPwaInstallCapture();
  }, []);

  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={isDev}
      register={!isDev}
      cacheOnNavigation
      reloadOnOnline
    >
      {children}
      {!isDev && (
        <>
          <PushSubscriptionSync />
          <PwaPushPrompt />
          <PwaUpdatePrompt />
        </>
      )}
    </SerwistProvider>
  );
}
