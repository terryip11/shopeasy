import Link from 'next/link';
import { AdminOrderFlowStep } from '@/components/admin/admin-order-flow-step';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import type { OrderTraceRow } from '@/lib/admin/order-trace';
import { DELIVERY_JOB_STATUS_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function recipientLabel(row: OrderTraceRow) {
  return row.shipping_name?.trim() || row.buyer_name?.trim() || '—';
}

function jobTypeLabel(type: string) {
  if (type === 'food') return JOB_TYPE_LABELS.food;
  if (type === 'parcel') return JOB_TYPE_LABELS.parcel;
  return type;
}

export function AdminOrderTraceTable({ rows }: { rows: OrderTraceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center text-sm text-gray-500 shadow dark:bg-gray-900">
        暫無符合條件的訂單
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/orders/trace?q=${encodeURIComponent(row.id)}`}
                  className="font-mono text-sm font-semibold text-orange-600 hover:underline"
                >
                  #{row.id.slice(0, 8)}
                </Link>
                <OrderStatusBadge status={row.status} />
                <span className="text-sm text-gray-500">HK${row.total.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {row.merchant_name || '—'} · 收件 {recipientLabel(row)}
                {row.shipping_phone ? ` · ${row.shipping_phone}` : ''}
              </p>
              <p className="text-xs text-gray-400">
                建立 {new Date(row.created_at).toLocaleString('zh-HK')}
              </p>
            </div>
            {row.issues.length > 0 && (
              <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">流程異常</p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {row.issues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="overflow-x-auto px-4 py-3">
            <div className="flex min-w-max gap-2">
              {row.steps.map((step) => (
                <AdminOrderFlowStep
                  key={step.key}
                  label={step.label}
                  state={step.state}
                  detail={step.detail}
                  at={step.at}
                />
              ))}
            </div>
          </div>

          {row.delivery_jobs.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                配送任務明細
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">類型</TableHead>
                    <TableHead className="text-xs">狀態</TableHead>
                    <TableHead className="text-xs">配送員</TableHead>
                    <TableHead className="text-xs">接單</TableHead>
                    <TableHead className="text-xs">取件</TableHead>
                    <TableHead className="text-xs">送達</TableHead>
                    <TableHead className="text-xs">備註</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.delivery_jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs">{jobTypeLabel(job.job_type)}</TableCell>
                      <TableCell className="text-xs">
                        {DELIVERY_JOB_STATUS_LABELS[
                          job.status as keyof typeof DELIVERY_JOB_STATUS_LABELS
                        ] ?? job.status}
                      </TableCell>
                      <TableCell className="text-xs">
                        {job.courier_name || (job.courier_id ? job.courier_id.slice(0, 8) : '—')}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {job.assigned_at
                          ? new Date(job.assigned_at).toLocaleString('zh-HK')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {job.picked_up_at
                          ? new Date(job.picked_up_at).toLocaleString('zh-HK')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {job.delivered_at
                          ? new Date(job.delivered_at).toLocaleString('zh-HK')
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate text-xs text-gray-400">
                        {job.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
