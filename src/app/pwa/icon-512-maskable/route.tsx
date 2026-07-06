import { ImageResponse } from 'next/og';
import { AppIconImage } from '@/lib/pwa/app-icon';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(<AppIconImage size={512} maskable />, {
    width: 512,
    height: 512,
  });
}
