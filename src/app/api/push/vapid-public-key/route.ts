import { NextResponse } from 'next/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push/vapid';

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({
    enabled: true,
    publicKey: getVapidPublicKey(),
  });
}
