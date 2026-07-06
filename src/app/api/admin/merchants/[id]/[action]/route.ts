import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  approveMerchant,
  rejectMerchant,
  suspendMerchant,
} from '@/lib/admin/merchant-actions';
import { requirePermission } from '@/lib/auth/server';

type RouteContext = { params: Promise<{ id: string; action: string }> };

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id, action } = await context.params;

  if (action === 'approve') {
    const auth = await requirePermission('merchants:approve');
    if (!auth.authorized) {
      return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
    }
    try {
      await approveMerchant(id, auth.user!.id);
      return NextResponse.json({ success: true, status: 'active' });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  if (action === 'reject') {
    const auth = await requirePermission('merchants:approve');
    if (!auth.authorized) {
      return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
    }
    try {
      const body = await request.json().catch(() => ({}));
      const { reason } = rejectSchema.parse(body);
      await rejectMerchant(id, auth.user!.id, reason);
      return NextResponse.json({ success: true, status: 'rejected' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
      }
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  if (action === 'suspend') {
    const auth = await requirePermission('merchants:suspend');
    if (!auth.authorized) {
      return NextResponse.json({ error: '僅全權管理員可停用商家' }, { status: 403 });
    }
    try {
      await suspendMerchant(id, auth.user!.id);
      return NextResponse.json({ success: true, status: 'suspended' });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: '無效操作' }, { status: 404 });
}
