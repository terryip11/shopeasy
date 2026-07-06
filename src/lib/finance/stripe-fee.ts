import 'server-only';

import { getStripe } from '@/lib/payment/stripe';
import { STRIPE_FEE_FIXED_HKD, STRIPE_FEE_PERCENT, roundMoney } from '@/lib/finance/config';

/** 估算 Stripe 手續費（HKD） */
export function estimateStripeFeeHkd(amountHkd: number): number {
  if (amountHkd <= 0) return 0;
  return roundMoney(amountHkd * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_HKD);
}

/** 從 PaymentIntent 讀取實際 Stripe 費用（失敗則回傳估算值） */
export async function resolveStripeFeeHkd(
  paymentId: string | null | undefined,
  amountHkd: number
): Promise<number> {
  if (!paymentId) {
    return 0;
  }

  // 開發標記已付：無真實 Stripe 扣款，用香港卡費率估算供財務預覽
  if (paymentId.startsWith('dev_')) {
    return estimateStripeFeeHkd(amountHkd);
  }

  try {
    const stripe = getStripe();
    let paymentIntentId = paymentId;

    if (paymentId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(paymentId);
      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || paymentId;
    }

    if (!paymentIntentId.startsWith('pi_')) {
      return estimateStripeFeeHkd(amountHkd);
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });

    const charge = pi.latest_charge;
    if (typeof charge === 'object' && charge?.balance_transaction) {
      const bt =
        typeof charge.balance_transaction === 'string'
          ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
          : charge.balance_transaction;
      if (bt.currency === 'hkd') {
        return roundMoney(bt.fee / 100);
      }
    }
  } catch (err) {
    console.warn('[finance] resolveStripeFeeHkd:', err);
  }

  return estimateStripeFeeHkd(amountHkd);
}
