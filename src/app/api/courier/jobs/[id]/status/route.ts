import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateJobStatus } from '@/lib/courier/server';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  status: z.enum(['picked_up', 'delivered', 'failed']),
  lat: z.number().optional(),
  lng: z.number().optional(),
  pickup_code: z.string().optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const { status, lat, lng, pickup_code } = bodySchema.parse(await request.json());
    const location = lat != null && lng != null ? { lat, lng } : undefined;
    const { data, error } = await updateJobStatus(id, status, location, pickup_code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: '無法更新狀態' }, { status: 409 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
