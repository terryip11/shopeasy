/**
 * 關於平台 — 手機亦可造訪的完整介紹頁
 */

import type { Metadata } from 'next';
import { PlatformLandingPage } from '@/components/marketing/platform-landing-page';
import { getLandingVariant } from '@/lib/marketing/landing-theme';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '關於 ShopEasy',
  description: '了解 ShopEasy 如何連接買家、商家與配送夥伴',
};

export default async function AboutPage() {
  const variant = await getLandingVariant();
  return <PlatformLandingPage variant={variant} />;
}
