import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  formatPaymentOptions,
  resolveCheckoutMerchants,
} from '@/lib/checkout/payment-options';

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        price: z.number().positive(),
        image: z.string().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

/** 結帳前查詢可用付款方式（無需登入） */
export async function POST(request: NextRequest) {
  try {
    const { items } = bodySchema.parse(await request.json());
    const { merchants, enabled } = await resolveCheckoutMerchants(items);
    const options = formatPaymentOptions(enabled, merchants);

    return NextResponse.json({
      methods: options,
      selectable: options.filter((o) => o.available),
      merchantCount: merchants.length,
      subtotal: merchants.reduce((s, m) => s + m.subtotal, 0),
      shippingFee: merchants.reduce((s, m) => s + m.shippingFee, 0),
      total: merchants.reduce((s, m) => s + m.total, 0),
      merchants: merchants.map((m) => ({
        merchantId: m.merchantId,
        merchantName: m.merchantName,
        subtotal: m.subtotal,
        shippingFee: m.shippingFee,
        total: m.total,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const msg = (error as Error).message || '';
    if (msg.includes('payment_methods')) {
      return NextResponse.json(
        {
          error:
            '資料庫尚未設定商家付款方式欄位，請執行 supabase/migrate-v13-v17-payment-all.sql',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
