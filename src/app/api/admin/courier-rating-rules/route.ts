import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/server';
import {
  deleteRatingSurchargeRule,
  getAdminRatingSurchargeRules,
  upsertRatingSurchargeRule,
} from '@/lib/admin/courier-rating-rules';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  rating_below: z.number().min(0.1).max(5),
  surcharge_hkd: z.number().min(0).max(99999),
  label: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const auth = await requirePermission('couriers:read');
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const rules = await getAdminRatingSurchargeRules();
    return NextResponse.json({ rules });
  } catch (error) {
    const msg = (error as Error).message || '';
    if (msg.includes('courier_buyer_rating_surcharges')) {
      return NextResponse.json(
        {
          error:
            '資料庫尚未建立評分加價規則表，請執行 supabase/migrate-v23-shipping-buyer-rating.sql',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('couriers:manage');
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  try {
    const body = upsertSchema.parse(await request.json());
    const result = await upsertRatingSurchargeRule(body, auth.user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ rule: result.rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
