/**
 * 首頁 — 平台介紹落地頁（版面由 admin 設定）
 * 純公開內容：ISR 60 秒；admin 改版面會 revalidateTag 立即失效
 */

import { PlatformLandingPage } from '@/components/marketing/platform-landing-page';
import { getLandingVariant } from '@/lib/marketing/landing-theme';

export const revalidate = 60;

export default async function HomePage() {
  const variant = await getLandingVariant();
  return <PlatformLandingPage variant={variant} />;
}
