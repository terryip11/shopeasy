import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateCourierLocation } from '@/lib/courier/server';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const { lat, lng } = bodySchema.parse(await request.json());
    const { error, skipped } = await updateCourierLocation(id, lat, lng);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, skipped: skipped ?? false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
