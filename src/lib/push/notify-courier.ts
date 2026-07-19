import 'server-only';

import { firePushToUser } from '@/lib/push/send';
import { JOB_TYPE_LABELS, type DeliveryJobType } from '@/lib/auth/capabilities';

function courierHubUrl(jobTypes?: DeliveryJobType[]) {
  if (jobTypes?.length === 1 && jobTypes[0] === 'food') return '/courier/food';
  if (jobTypes?.length === 1 && jobTypes[0] === 'parcel') return '/courier/parcel';
  return '/courier';
}

function jobTypesLabel(jobTypes: DeliveryJobType[]) {
  return jobTypes.map((t) => JOB_TYPE_LABELS[t]).join('、');
}

/** 配送員申請審核通過 */
export function notifyCourierApproved(userId: string, jobTypes: DeliveryJobType[]) {
  const types = jobTypesLabel(jobTypes);
  firePushToUser(userId, {
    title: '配送員申請已通過',
    body: `您的${types}申請已審核通過，現在可以上線接單了`,
    url: courierHubUrl(jobTypes),
    tag: `courier-approved-${userId}`,
  });
}

/** 配送員申請被拒絕 */
export function notifyCourierRejected(userId: string, reason: string) {
  const trimmed = reason.trim();
  firePushToUser(userId, {
    title: '配送員申請未通過',
    body: trimmed
      ? `原因：${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}`
      : '請至配送中心查看詳情或重新申請',
    url: '/courier',
    tag: `courier-rejected-${userId}`,
  });
}
