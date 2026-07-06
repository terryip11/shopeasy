'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CAPABILITY_LABELS, type UserCapability } from '@/lib/auth/capabilities';
import { COURIER_STATUS_LABELS } from '@/lib/courier/types';

const ROLES = ['buyer', 'merchant', 'admin', 'accountant', 'super_admin'] as const;

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  buyer: '買家',
  merchant: '商家',
  admin: '營運管理員',
  accountant: '會計員',
  super_admin: '全權管理員',
};

const CAPABILITIES: UserCapability[] = ['food_courier', 'parcel_courier'];

export type AdminUserRow = {
  id: string;
  role: string;
  display_name: string | null;
  created_at: string;
  capabilities: UserCapability[];
  courier_status: string | null;
};

export function UserRoleManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateRole = async (userId: string, role: string) => {
    if (!confirm(`確認將此用戶平台角色改為「${ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}」？`)) {
      return;
    }
    setLoading(`${userId}:role`);

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || '更新失敗');
    }
    setLoading(null);
  };

  const updateCapability = async (
    userId: string,
    capability: UserCapability,
    action: 'grant' | 'revoke'
  ) => {
    const label = CAPABILITY_LABELS[capability];
    const verb = action === 'grant' ? '授予' : '移除';
    if (!confirm(`確認${verb}「${label}」能力？`)) return;

    setLoading(`${userId}:${capability}`);

    const res = await fetch(`/api/admin/users/${userId}/capabilities`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability, action }),
    });

    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || '更新失敗');
    }
    setLoading(null);
  };

  const renderActions = (u: AdminUserRow) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ROLES.filter((r) => r !== u.role).map((role) => (
          <Button
            key={role}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
            disabled={loading?.startsWith(u.id)}
            onClick={() => updateRole(u.id, role)}
          >
            設為{ROLE_LABELS[role]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CAPABILITIES.map((cap) => {
          const has = u.capabilities.includes(cap);
          return (
            <Button
              key={cap}
              variant={has ? 'outline' : 'secondary'}
              size="sm"
              className={`text-xs sm:text-sm ${has ? 'text-red-600' : ''}`}
              disabled={loading === `${u.id}:${cap}`}
              onClick={() => updateCapability(u.id, cap, has ? 'revoke' : 'grant')}
            >
              {has ? `移除${CAPABILITY_LABELS[cap]}` : `授予${CAPABILITY_LABELS[cap]}`}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderMeta = (u: AdminUserRow) => (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">
          {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
        </span>
        {u.courier_status ? (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {COURIER_STATUS_LABELS[u.courier_status as keyof typeof COURIER_STATUS_LABELS] ||
              u.courier_status}
          </span>
        ) : null}
      </div>
      {u.capabilities.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {u.capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
            >
              {CAPABILITY_LABELS[cap]}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <article
            key={u.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3">
              <p className="font-medium text-gray-900 dark:text-white">
                {u.display_name || '—'}
              </p>
              <p className="text-xs font-mono text-gray-400">{u.id.slice(0, 12)}…</p>
            </div>
            {renderMeta(u)}
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              {renderActions(u)}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block dark:bg-gray-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">用戶</th>
              <th className="px-4 py-3 text-left">平台角色</th>
              <th className="px-4 py-3 text-left">配送能力</th>
              <th className="px-4 py-3 text-left">配送員狀態</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.display_name || '—'}</p>
                  <p className="text-xs font-mono text-gray-400">{u.id.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800">
                    {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.capabilities.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                        >
                          {CAPABILITY_LABELS[cap]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.courier_status ? (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {COURIER_STATUS_LABELS[u.courier_status as keyof typeof COURIER_STATUS_LABELS] ||
                        u.courier_status}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{renderActions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
