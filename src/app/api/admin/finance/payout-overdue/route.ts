import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, getUserRole } from '@/lib/auth/server';
import { canManageFinance } from '@/lib/auth/permissions';
import {
  listAdminOverdueMerchants,
  resolveUnpaidReport,
  setMerchantDeliveryPayoutBlock,
  setPayoutOverdueThresholds,
} from '@/lib/merchant/payout-compliance';
import { logAdminAction } from '@/lib/admin/merchant-actions';

export async function GET() {
  const role = await getUserRole();
  if (!canManageFinance(role)) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }
  try {
    const data = await listAdminOverdueMerchants();
    return NextResponse.json(data);
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('payout_unpaid_reports') || msg.includes('payout_delivery_blocked')) {
      return NextResponse.json(
        { error: '請執行 supabase/migrate-v55-payout-overdue.sql' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('thresholds'),
    remindDays: z.number().int().min(1).max(90),
    blockDays: z.number().int().min(1).max(90),
  }),
  z.object({
    action: z.literal('block'),
    merchantId: z.string().uuid(),
    blocked: z.boolean(),
    reason: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal('resolve_report'),
    reportId: z.string().uuid(),
    status: z.enum(['resolved', 'dismissed']),
    adminNote: z.string().max(500).optional(),
  }),
]);

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  const role = await getUserRole();
  if (!user || !canManageFinance(role)) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());

    if (body.action === 'thresholds') {
      const result = await setPayoutOverdueThresholds(
        { remindDays: body.remindDays, blockDays: body.blockDays },
        user.id
      );
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      await logAdminAction(
        user.id,
        'platform.payout_overdue.thresholds',
        'platform_settings',
        'payout_overdue',
        result.thresholds
      );
      return NextResponse.json({ thresholds: result.thresholds });
    }

    if (body.action === 'block') {
      const result = await setMerchantDeliveryPayoutBlock({
        merchantId: body.merchantId,
        blocked: body.blocked,
        reason: body.reason,
        adminId: user.id,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      await logAdminAction(
        user.id,
        body.blocked ? 'merchant.payout_delivery.block' : 'merchant.payout_delivery.unblock',
        'merchants',
        body.merchantId,
        { reason: body.reason || null }
      );
      return NextResponse.json({ ok: true });
    }

    const result = await resolveUnpaidReport({
      reportId: body.reportId,
      adminId: user.id,
      status: body.status,
      adminNote: body.adminNote,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await logAdminAction(
      user.id,
      `payout_unpaid_report.${body.status}`,
      'payout_unpaid_reports',
      body.reportId,
      { adminNote: body.adminNote || null }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
