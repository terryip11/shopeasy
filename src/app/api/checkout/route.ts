import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getStripe,
  getAppUrl,
  isStripePaymentsEnabled,
  STRIPE_PAYMENTS_UNAVAILABLE_REASON,
  stripeProductImageUrl,
} from '@/lib/payment/stripe';
import { checkoutSchema } from '@/lib/checkout/shipping';
import { resolveCheckoutItemPrices } from '@/lib/checkout/pricing';
import { getAuthUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { validateStockAsync } from '@/lib/inventory';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  isManualPaymentMethod,
  resolveCheckoutMerchants,
} from '@/lib/checkout/payment-options';
import { validatePayoutForMethods } from '@/lib/merchant/payout';
import { saveShippingToAddressBook } from '@/lib/buyer/addresses';
import { notifyMerchantNewPendingOrder } from '@/lib/push/notify-order';
import { resolveShareAttribution } from '@/lib/affiliate/attribution';
import { AFFILIATE_COOKIE_NAME } from '@/lib/affiliate/client';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  merchant_id: string;
  status: string;
  images: string[];
  stock: number;
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = await rateLimit(`checkout:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `結帳過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
        { status: 429 }
      );
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const body = await request.json();
    const {
      items,
      shipping,
      payment_method: paymentMethod,
      save_to_address_book: saveToAddressBook,
      address_label: addressLabel,
      affiliate_ref: bodyAffiliateRef,
    } = checkoutSchema.parse(body);

    const cookieRef = request.cookies.get(AFFILIATE_COOKIE_NAME)?.value ?? null;
    const affiliateRef = bodyAffiliateRef?.trim() || cookieRef?.trim() || null;

    const supabase = await createClient();
    const productIds = items.map((i) => i.id);

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, merchant_id, status, images, stock')
      .in('id', productIds)
      .eq('status', 'published');

    if (error) throw error;

    const productMap = new Map((products as ProductRow[] | null)?.map((p) => [p.id, p]) || []);

    const stockError = await validateStockAsync(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        variant_id: i.variant_id,
      }))
    );
    if (stockError) {
      return NextResponse.json({ error: stockError }, { status: 400 });
    }

    const priced = await resolveCheckoutItemPrices(supabase, items, productMap);
    if ('error' in priced) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }
    const pricedItems = priced.items;

    const { methods, merchants } = await resolveCheckoutMerchants(pricedItems);
    if (!methods.includes(paymentMethod as MerchantPaymentMethod)) {
      return NextResponse.json(
        { error: '購物車內有商家不支援所選付款方式，請改用其他方式或分開下單' },
        { status: 400 }
      );
    }

    if (isManualPaymentMethod(paymentMethod)) {
      for (const m of merchants) {
        const err = validatePayoutForMethods([paymentMethod], m.payout);
        if (err) {
          return NextResponse.json(
            { error: `${m.merchantName}：${err}` },
            { status: 400 }
          );
        }
      }
    }

    const orderGroups = new Map<string, { items: typeof pricedItems; subtotal: number }>();
    for (const item of pricedItems) {
      const product = productMap.get(item.id)!;
      const group = orderGroups.get(product.merchant_id) || { items: [], subtotal: 0 };
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      orderGroups.set(product.merchant_id, group);
    }

    const merchantShippingMap = new Map(
      merchants.map((m) => [m.merchantId, m.shippingFee])
    );

    const orderIds: string[] = [];

    for (const [merchantId, group] of orderGroups) {
      const shippingFee = merchantShippingMap.get(merchantId) ?? 0;
      const subtotal = group.subtotal;
      const orderTotal = subtotal + shippingFee;
      const orderItems = group.items.map((i) => ({
        product_id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
        ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        ...(i.variant_label ? { variant_label: i.variant_label } : {}),
        ...(i.option_selections?.length ? { option_selections: i.option_selections } : {}),
      }));

      const productIds = group.items.map((i) => i.id);
      const attribution = await resolveShareAttribution({
        refCode: affiliateRef,
        productIds,
        buyerId: user.id,
        merchantId,
      });

      const orderInsert: Record<string, unknown> = {
        user_id: user.id,
        merchant_id: merchantId,
        items: orderItems,
        subtotal,
        shipping_fee: shippingFee,
        total: orderTotal,
        status: 'pending',
        payment_method: paymentMethod,
        shipping_name: shipping.name,
        shipping_phone: shipping.phone,
        shipping_address: shipping.address,
        shipping_zone_id: shipping.zone_id,
      };

      if (attribution) {
        orderInsert.share_link_id = attribution.shareLinkId;
        orderInsert.promoter_id = attribution.promoterId;
        orderInsert.affiliate_commission_rate = attribution.commissionRate;
        orderInsert.affiliate_status = 'pending';
      }

      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .insert(orderInsert)
        .select('id')
        .single();

      if (orderError) {
        const hint = orderError.message?.includes('payment_method')
          ? '資料庫尚未加入 orders.payment_method 欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v17-order-payment-method.sql'
          : orderError.message?.includes('shipping_fee') || orderError.message?.includes('subtotal')
            ? '資料庫尚未加入訂單運費欄位，請執行 supabase/migrate-v23-shipping-buyer-rating.sql'
            : orderError.message;
        throw new Error(hint);
      }
      orderIds.push((order as { id: string }).id);
      void notifyMerchantNewPendingOrder((order as { id: string }).id, merchantId);
    }

    if (saveToAddressBook) {
      try {
        await saveShippingToAddressBook(user.id, shipping, {
          label: addressLabel,
          setDefault: true,
        });
      } catch (e) {
        console.error('[checkout] save address:', e);
      }
    }

    if (isManualPaymentMethod(paymentMethod)) {
      return NextResponse.json({
        type: 'manual',
        orderIds,
        redirectUrl: `/checkout/pay?orders=${orderIds.join(',')}`,
      });
    }

    if (!isStripePaymentsEnabled()) {
      return NextResponse.json({ error: STRIPE_PAYMENTS_UNAVAILABLE_REASON }, { status: 503 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const lineItems = pricedItems.map((item) => {
      const product = productMap.get(item.id)!;
      const image = stripeProductImageUrl(item.image || product.images?.[0]);
      return {
        price_data: {
          currency: 'hkd',
          product_data: {
            name: item.name,
            ...(image ? { images: [image] } : {}),
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const totalShipping = merchants.reduce((s, m) => s + m.shippingFee, 0);
    if (totalShipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'hkd',
          product_data: {
            name: '運費',
          },
          unit_amount: Math.round(totalShipping * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        user_id: user.id,
        order_ids: orderIds.join(','),
      },
    });

    await (supabase as any)
      .from('orders')
      .update({ stripe_payment_id: session.id, payment_method: 'card' })
      .in('id', orderIds);

    return NextResponse.json({ type: 'stripe', url: session.url, orderIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    const msg = (error as Error).message || '';
    if (msg.includes('payment_method') && msg.includes('schema cache')) {
      return NextResponse.json(
        {
          error:
            '資料庫尚未加入 orders.payment_method 欄位，請在 Supabase SQL Editor 執行 supabase/migrate-v17-order-payment-method.sql',
        },
        { status: 500 }
      );
    }
    console.error('Checkout error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
