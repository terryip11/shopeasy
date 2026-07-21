/**
 * 首頁 — 平台介紹落地頁（版面由 admin 設定）
 */

import { PlatformLandingPage } from '@/components/marketing/platform-landing-page';
import { getLandingVariant } from '@/lib/marketing/landing-theme';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const variant = await getLandingVariant();
  return <PlatformLandingPage variant={variant} />;
}
