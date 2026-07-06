import 'server-only';

import webpush from 'web-push';
import {
  deletePushSubscriptionByEndpoint,
  getPushSubscriptionsForUser,
} from '@/lib/push/subscriptions';
import type { PushPayload } from '@/lib/push/types';
import {
  getVapidContactEmail,
  getVapidPrivateKey,
  getVapidPublicKey,
  isPushConfigured,
} from '@/lib/push/vapid';

let vapidReady = false;

function ensureVapid() {
  if (vapidReady || !isPushConfigured()) return;
  const publicKey = getVapidPublicKey()!;
  const privateKey = getVapidPrivateKey()!;
  webpush.setVapidDetails(`mailto:${getVapidContactEmail()}`, publicKey, privateKey);
  vapidReady = true;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0;
  ensureVapid();

  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
        } else {
          console.error('[push] send failed:', status, sub.endpoint.slice(0, 48));
        }
      }
    })
  );

  return sent;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  const unique = [...new Set(userIds.filter(Boolean))];
  let sent = 0;
  for (const userId of unique) {
    sent += await sendPushToUser(userId, payload);
  }
  return sent;
}

/** 非阻塞推播，不影響主流程 */
export function firePushToUser(userId: string, payload: PushPayload) {
  void sendPushToUser(userId, payload).catch((err) => {
    console.error('[push] firePushToUser:', err);
  });
}

export function firePushToUsers(userIds: string[], payload: PushPayload) {
  void sendPushToUsers(userIds, payload).catch((err) => {
    console.error('[push] firePushToUsers:', err);
  });
}
