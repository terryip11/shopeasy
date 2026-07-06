import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_COURIER_FEE_BY_JOB_TYPE,
  roundMoney,
} from '@/lib/finance/config';
import { resolveOrderCourierBaseFee } from '@/lib/merchant/product-shipping';
import {
  applyCourierMinBaseFee,
  getCourierMinBaseFees,
} from '@/lib/finance/platform-settings';

/** 讀取商家設定的每單配送員工資；可選 orderId 以套用商品級覆寫，並受平台最低工資保底 */
export async function getMerchantCourierFee(
  merchantId: string,
  jobType: string,
  orderId?: string
): Promise<number> {
  const supabase = createAdminClient();
  const [{ data }, minFees] = await Promise.all([
    supabase
      .from('merchants')
      .select('courier_fee_food, courier_fee_parcel')
      .eq('id', merchantId)
      .maybeSingle(),
    getCourierMinBaseFees(),
  ]);

  const row = data as {
    courier_fee_food?: number | null;
    courier_fee_parcel?: number | null;
  } | null;

  let merchantDefault: number;
  if (jobType === 'parcel') {
    merchantDefault = roundMoney(
      Number(row?.courier_fee_parcel ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.parcel)
    );
  } else {
    merchantDefault = roundMoney(
      Number(row?.courier_fee_food ?? DEFAULT_COURIER_FEE_BY_JOB_TYPE.food)
    );
  }

  const resolved = orderId
    ? await resolveOrderCourierBaseFee(merchantId, orderId, merchantDefault)
    : merchantDefault;

  return applyCourierMinBaseFee(resolved, jobType, minFees);
}
