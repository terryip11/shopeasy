import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { MERCHANT_PAYMENT_METHODS, normalizePaymentMethods } from '@/lib/merchant/payment-methods';
import { payoutFromMerchant, validatePayoutForMethods, methodHasPayoutConfig, syncPaymentMethodsFromPayout } from '@/lib/merchant/payout';
import { MERCHANT_BUSINESS_TYPES } from '@/lib/merchant/business-type';
import { normalizeStoreThemeColor } from '@/lib/merchant/store-theme';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, '主題色格式須為 #RRGGBB')
  .optional();

const bodySchema = z.object({
  name: z.string().min(1, '店鋪名稱不可為空').max(80).optional(),
  logo_url: z.string().url('Logo 網址無效').nullable().optional(),
  banner_url: z.string().url('橫幅網址無效').nullable().optional(),
  store_tagline: z.string().max(120, '標語最多 120 字').nullable().optional(),
  store_description: z.string().max(500, '簡介最多 500 字').nullable().optional(),
  theme_color: hexColorSchema,
  payment_methods: z
    .array(z.enum(MERCHANT_PAYMENT_METHODS))
    .min(1, '請至少保留一種支付方式')
    .optional(),
  payout_bank_name: z.string().max(100).nullable().optional(),
  payout_account_holder: z.string().max(100).nullable().optional(),
  payout_account_number: z.string().max(50).nullable().optional(),
  payout_fps_id: z.string().max(100).nullable().optional(),
  payout_wechat_id: z.string().max(100).nullable().optional(),
  payout_wechat_qr_url: z.string().url('微信收款碼網址無效').nullable().optional(),
  payout_alipay_id: z.string().max(100).nullable().optional(),
  payout_alipay_qr_url: z.string().url('支付寶收款碼網址無效').nullable().optional(),
  courier_fee_food: z.number().min(0, '送餐工資不可為負數').max(99999).optional(),
  courier_fee_parcel: z.number().min(0, '送貨工資不可為負數').max(99999).optional(),
  business_type: z.enum(MERCHANT_BUSINESS_TYPES).optional(),
});

function schemaColumnHint(msg: string): string | null {
  if (msg.includes('payment_method') && msg.includes('orders')) {
    return '資料庫尚未加入 orders.payment_method 欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v17-order-payment-method.sql';
  }
  if (msg.includes('payment_methods')) {
    return '資料庫尚未加入 payment_methods 欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v13-merchant-payment-methods.sql';
  }
  if (msg.includes('payout_wechat_qr_url') || msg.includes('payout_alipay_qr_url')) {
    return '資料庫尚未加入收款碼欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v16-payment-qr-codes.sql';
  }
  if (msg.includes('payout_wechat_id') || msg.includes('payout_alipay_id')) {
    return '資料庫尚未加入微信/支付寶收款欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v15-wechat-alipay.sql';
  }
  if (msg.includes('payout_')) {
    return '資料庫尚未加入收款欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v14-merchant-payout.sql';
  }
  if (msg.includes('courier_fee_')) {
    return '資料庫尚未加入配送員工資欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v21-merchant-courier-fees.sql';
  }
  if (msg.includes('business_type')) {
    return '資料庫尚未加入商家業務類型欄位，請執行 supabase/migrate-v28-merchant-business-type.sql';
  }
  if (
    msg.includes('store_tagline') ||
    msg.includes('store_description') ||
    msg.includes('banner_url') ||
    msg.includes('theme_color')
  ) {
    return '資料庫尚未加入店鋪品牌欄位，請執行 supabase/migrate-v41-merchant-store-profile.sql';
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const merchant = await getActiveMerchantForUser();
    if (!merchant) {
      return NextResponse.json({ error: '請先完成店鋪審核' }, { status: 403 });
    }

    const body = bodySchema.parse(await request.json());
    if (
      body.name === undefined &&
      body.logo_url === undefined &&
      body.banner_url === undefined &&
      body.store_tagline === undefined &&
      body.store_description === undefined &&
      body.theme_color === undefined &&
      body.payment_methods === undefined &&
      body.payout_bank_name === undefined &&
      body.payout_account_holder === undefined &&
      body.payout_account_number === undefined &&
      body.payout_fps_id === undefined &&
      body.payout_wechat_id === undefined &&
      body.payout_wechat_qr_url === undefined &&
      body.payout_alipay_id === undefined &&
      body.payout_alipay_qr_url === undefined &&
      body.courier_fee_food === undefined &&
      body.courier_fee_parcel === undefined &&
      body.business_type === undefined
    ) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.logo_url !== undefined) patch.logo_url = body.logo_url;
    if (body.banner_url !== undefined) patch.banner_url = body.banner_url;
    if (body.store_tagline !== undefined) {
      patch.store_tagline = body.store_tagline?.trim() || null;
    }
    if (body.store_description !== undefined) {
      patch.store_description = body.store_description?.trim() || null;
    }
    if (body.theme_color !== undefined) {
      patch.theme_color = normalizeStoreThemeColor(body.theme_color);
    }

    const nextMethods =
      body.payment_methods !== undefined
        ? normalizePaymentMethods(body.payment_methods)
        : normalizePaymentMethods(merchant.payment_methods);

    let methodsForSave = nextMethods;
    if (body.payment_methods !== undefined) {
      patch.payment_methods = nextMethods;
    }

    if (body.payout_bank_name !== undefined) {
      patch.payout_bank_name = body.payout_bank_name?.trim() || null;
    }
    if (body.payout_account_holder !== undefined) {
      patch.payout_account_holder = body.payout_account_holder?.trim() || null;
    }
    if (body.payout_account_number !== undefined) {
      patch.payout_account_number = body.payout_account_number?.trim() || null;
    }
    if (body.payout_fps_id !== undefined) {
      patch.payout_fps_id = body.payout_fps_id?.trim() || null;
    }
    if (body.payout_wechat_id !== undefined) {
      patch.payout_wechat_id = body.payout_wechat_id?.trim() || null;
    }
    if (body.payout_wechat_qr_url !== undefined) {
      patch.payout_wechat_qr_url = body.payout_wechat_qr_url;
    }
    if (body.payout_alipay_id !== undefined) {
      patch.payout_alipay_id = body.payout_alipay_id?.trim() || null;
    }
    if (body.payout_alipay_qr_url !== undefined) {
      patch.payout_alipay_qr_url = body.payout_alipay_qr_url;
    }
    if (body.courier_fee_food !== undefined) {
      patch.courier_fee_food = body.courier_fee_food;
    }
    if (body.courier_fee_parcel !== undefined) {
      patch.courier_fee_parcel = body.courier_fee_parcel;
    }
    if (body.business_type !== undefined) {
      patch.business_type = body.business_type;
    }

    const payout = payoutFromMerchant({
      payout_bank_name:
        body.payout_bank_name !== undefined
          ? body.payout_bank_name
          : merchant.payout_bank_name,
      payout_account_holder:
        body.payout_account_holder !== undefined
          ? body.payout_account_holder
          : merchant.payout_account_holder,
      payout_account_number:
        body.payout_account_number !== undefined
          ? body.payout_account_number
          : merchant.payout_account_number,
      payout_fps_id:
        body.payout_fps_id !== undefined ? body.payout_fps_id : merchant.payout_fps_id,
      payout_wechat_id:
        body.payout_wechat_id !== undefined ? body.payout_wechat_id : merchant.payout_wechat_id,
      payout_wechat_qr_url:
        body.payout_wechat_qr_url !== undefined
          ? body.payout_wechat_qr_url
          : merchant.payout_wechat_qr_url,
      payout_alipay_id:
        body.payout_alipay_id !== undefined ? body.payout_alipay_id : merchant.payout_alipay_id,
      payout_alipay_qr_url:
        body.payout_alipay_qr_url !== undefined
          ? body.payout_alipay_qr_url
          : merchant.payout_alipay_qr_url,
    });

    const touchesPayout =
      body.payout_bank_name !== undefined ||
      body.payout_account_holder !== undefined ||
      body.payout_account_number !== undefined ||
      body.payout_fps_id !== undefined ||
      body.payout_wechat_id !== undefined ||
      body.payout_wechat_qr_url !== undefined ||
      body.payout_alipay_id !== undefined ||
      body.payout_alipay_qr_url !== undefined;

    if (touchesPayout) {
      methodsForSave = syncPaymentMethodsFromPayout(methodsForSave, payout);
      patch.payment_methods = methodsForSave;

      const methodsToValidate = methodsForSave.filter(
        (m) => m !== 'card' && methodHasPayoutConfig(m, payout)
      );
      const payoutError = validatePayoutForMethods(methodsToValidate, payout);
      if (payoutError) {
        return NextResponse.json({ error: payoutError }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('merchants')
      .update(patch)
      .eq('id', merchant.id)
      .select(
        'id, name, slug, logo_url, banner_url, store_tagline, store_description, theme_color, payment_methods, payout_bank_name, payout_account_holder, payout_account_number, payout_fps_id, payout_wechat_id, payout_wechat_qr_url, payout_alipay_id, payout_alipay_qr_url, courier_fee_food, courier_fee_parcel, business_type'
      )
      .single();

    if (error) {
      const hint = schemaColumnHint(error.message || '');
      if (hint) {
        return NextResponse.json({ error: hint }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ merchant: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
