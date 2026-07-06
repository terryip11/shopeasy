import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { approveTierUpgrade, rejectTierUpgrade } from '@/lib/admin/tier-upgrade-actions';
import { requirePermission } from '@/lib/auth/server';

type RouteContext = { params: Promise<{ id: string; action: string }> };

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id, action } = await context.params;
  const auth = await requirePermission('merchants:approve');
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
  }

  if (action === 'approve') {
    try {
      await approveTierUpgrade(id, auth.user!.id);
      return NextResponse.json({ success: true, status: 'approved' });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  if (action === 'reject') {
    try {
      const body = await request.json().catch(() => ({}));
      const { reason } = rejectSchema.parse(body);
      await rejectTierUpgrade(id, auth.user!.id, reason);
      return NextResponse.json({ success: true, status: 'rejected' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
      }
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: '無效操作' }, { status: 404 });
}
