import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/** 配送送達後將訂單標記為已完成（僅 paid / shipped） */
export async function completeOrderOnDelivery(orderId: string): Promise<void> {
  const admin = createAdminClient();
  await (admin as any)
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId)
    .in('status', ['paid', 'shipped']);
}
