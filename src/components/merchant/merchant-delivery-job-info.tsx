import type { DeliveryJobStatus } from '@/types/database';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import {
  DELIVERY_JOB_STATUS_LABELS,
  DELIVERY_JOB_STATUS_STYLES,
} from '@/lib/courier/types';
import type { MerchantDeliveryJobSummary } from '@/lib/merchant/delivery-job-summary';

function formatAssignedAt(iso: string) {
  return new Date(iso).toLocaleString('zh-HK', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MerchantDeliveryJobInfo({ job }: { job: MerchantDeliveryJobSummary | null }) {
  if (!job) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const status = job.status as DeliveryJobStatus;
  const statusLabel =
    DELIVERY_JOB_STATUS_LABELS[status] ?? job.status;
  const statusStyle =
    DELIVERY_JOB_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';

  const typeLabel =
    job.job_type === 'food'
      ? JOB_TYPE_LABELS.food
      : job.job_type === 'parcel'
        ? JOB_TYPE_LABELS.parcel
        : null;

  if (status === 'pending' && !job.courier_id) {
    return (
      <div className="space-y-1">
        {typeLabel && <p className="text-xs text-gray-500">{typeLabel}</p>}
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DELIVERY_JOB_STATUS_STYLES.pending}`}
        >
          {DELIVERY_JOB_STATUS_LABELS.pending}
        </span>
      </div>
    );
  }

  return (
    <div className="min-w-[7rem] space-y-1 text-sm">
      {typeLabel && <p className="text-xs text-gray-500">{typeLabel}</p>}
      {job.courier_name && (
        <p className="font-medium text-gray-900 dark:text-white">{job.courier_name}</p>
      )}
      {job.courier_phone ? (
        <a
          href={`tel:${job.courier_phone.replace(/\s/g, '')}`}
          className="block text-xs text-orange-600 hover:underline"
        >
          {job.courier_phone}
        </a>
      ) : job.courier_id ? (
        <p className="text-xs text-gray-400">未填電話</p>
      ) : null}
      {job.assigned_at && (
        <p className="text-xs text-gray-500">接單 {formatAssignedAt(job.assigned_at)}</p>
      )}
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
        {statusLabel}
      </span>
    </div>
  );
}
