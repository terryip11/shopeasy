'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { VEHICLE_LABELS } from '@/lib/courier/types';
import { JOB_TYPE_LABELS } from '@/lib/auth/capabilities';
import type { Database } from '@/types/database';

type CourierProfile = Database['public']['Tables']['courier_profiles']['Row'];

interface CourierApprovalListProps {
  applications: CourierProfile[];
  displayNames: Record<string, string | null>;
  zoneNameById?: Record<string, string>;
}

export function CourierApprovalList({
  applications,
  displayNames,
  zoneNameById = {},
}: CourierApprovalListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const approve = async (userId: string, preferred: CourierProfile['preferred_job_type']) => {
    const jobTypes =
      preferred === 'both'
        ? (['food', 'parcel'] as const)
        : preferred === 'parcel'
          ? (['parcel'] as const)
          : (['food'] as const);

    if (!confirm(`確認通過此配送員申請（${jobTypes.map((t) => JOB_TYPE_LABELS[t]).join('、')}）？`)) {
      return;
    }

    setLoadingId(userId);
    const res = await fetch(`/api/admin/couriers/${userId}?action=approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_types: jobTypes }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoadingId(null);
  };

  const reject = async (userId: string) => {
    const reason = prompt('請輸入拒絕原因');
    if (!reason) return;

    setLoadingId(userId);
    const res = await fetch(`/api/admin/couriers/${userId}?action=reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoadingId(null);
  };

  if (applications.length === 0) {
    return <p className="text-gray-500">暫無待審核配送員</p>;
  }

  return (
    <ul className="space-y-4">
      {applications.map((app) => (
        <li key={app.user_id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">{displayNames[app.user_id] || app.user_id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500 mt-1">電話：{app.phone || '—'}</p>
              <p className="text-sm text-gray-500">
                類型：
                {app.preferred_job_type === 'both'
                  ? '送餐 + 送貨'
                  : app.preferred_job_type === 'food'
                    ? '送餐員'
                    : '送貨員'}
              </p>
              <p className="text-sm text-gray-500">
                交通工具：{app.vehicle_type ? VEHICLE_LABELS[app.vehicle_type] : '—'}
              </p>
              {app.zone_ids.length > 0 && (
                <p className="text-sm text-gray-500">
                  申請區域：
                  {app.zone_ids.map((id) => zoneNameById[id] ?? id.slice(0, 8)).join('、')}
                </p>
              )}
              {app.hkid_image_url && (
                <p className="text-sm text-gray-500 mt-1">
                  香港身份證：
                  <a
                    href={normalizeR2ImageUrl(app.hkid_image_url) ?? app.hkid_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-orange-600 hover:underline"
                  >
                    查看影像
                  </a>
                </p>
              )}
              {app.declaration_accepted_at && (
                <p className="text-xs text-gray-400 mt-1">
                  已同意聲明：{new Date(app.declaration_accepted_at).toLocaleString('zh-TW')}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                申請時間：{new Date(app.applied_at).toLocaleString('zh-TW')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approve(app.user_id, app.preferred_job_type)}
                disabled={loadingId === app.user_id}
              >
                通過
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => reject(app.user_id)}
                disabled={loadingId === app.user_id}
              >
                拒絕
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
