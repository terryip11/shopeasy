import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateCourierLocationForActiveJobs } from '@/lib/courier/server';

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/** 一次上報 GPS，更新配送員所有進行中任務 */
export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = bodySchema.parse(await request.json());
    const { error, skipped, updated } = await updateCourierLocationForActiveJobs(lat, lng);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, skipped: skipped ?? false, updated: updated ?? 0 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
