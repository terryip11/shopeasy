import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { PushSubscriptionRow } from '@/lib/push/types';

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('push_subscriptions')
    .upsert(
      {
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );

  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw new Error(error.message);
}

export async function getPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data || []) as PushSubscriptionRow[];
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  const supabase = createAdminClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
