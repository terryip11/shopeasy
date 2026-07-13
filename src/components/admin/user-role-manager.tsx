'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAPABILITY_LABELS, type UserCapability } from '@/lib/auth/capabilities';
import { COURIER_STATUS_LABELS } from '@/lib/courier/types';
import { cn } from '@/lib/utils';

const ROLES = ['buyer', 'merchant', 'admin', 'accountant', 'super_admin'] as const;

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  buyer: '買家',
  merchant: '商家',
  admin: '營運管理員',
  accountant: '會計員',
  super_admin: '全權管理員',
};

const CAPABILITIES: UserCapability[] = ['food_courier', 'parcel_courier'];

const SELECT_CLASS = cn(
  'min-w-[9.5rem] max-w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs',
  'text-gray-700 shadow-sm transition-colors',
  'focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
);

export type AdminUserRow = {
  id: string;
  role: string;
  display_name: string | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  auth_provider: string | null;
  capabilities: UserCapability[];
  courier_status: string | null;
};

export function UserRoleManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [rolePick, setRolePick] = useState<Record<string, string>>({});
  const [capPick, setCapPick] = useState<Record<string, string>>({});

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

  const handleRoleSelect = async (userId: string, role: string) => {
    if (!role) return;
    await updateRole(userId, role);
    setRolePick((prev) => ({ ...prev, [userId]: '' }));
  };

  const handleCapabilitySelect = async (userId: string, value: string) => {
    if (!value) return;
    const [action, capability] = value.split(':') as ['grant' | 'revoke', UserCapability];
    if (action !== 'grant' && action !== 'revoke') return;
    await updateCapability(userId, capability, action);
    setCapPick((prev) => ({ ...prev, [userId]: '' }));
  };

  const renderActions = (u: AdminUserRow) => {
    const roleOptions = ROLES.filter((r) => r !== u.role);
    const capOptions = CAPABILITIES.map((cap) => {
      const has = u.capabilities.includes(cap);
      return {
        key: `${has ? 'revoke' : 'grant'}:${cap}`,
        label: has ? `移除${CAPABILITY_LABELS[cap]}` : `授予${CAPABILITY_LABELS[cap]}`,
      };
    });
    const isBusy = loading?.startsWith(u.id) ?? false;

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <select
          aria-label={`變更 ${u.display_name || u.id} 的平台角色`}
          className={SELECT_CLASS}
          value={rolePick[u.id] ?? ''}
          disabled={isBusy || roleOptions.length === 0}
          onChange={(e) => void handleRoleSelect(u.id, e.target.value)}
        >
          <option value="">變更平台角色…</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              設為{ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <select
          aria-label={`調整 ${u.display_name || u.id} 的配送能力`}
          className={SELECT_CLASS}
          value={capPick[u.id] ?? ''}
          disabled={isBusy || capOptions.length === 0}
          onChange={(e) => void handleCapabilitySelect(u.id, e.target.value)}
        >
          <option value="">配送能力…</option>
          {capOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderContact = (u: AdminUserRow) => (
    <div className="space-y-0.5 text-sm">
      <p className="text-gray-900 dark:text-white">
        {u.email ? (
          <a href={`mailto:${u.email}`} className="text-orange-600 hover:underline dark:text-orange-400">
            {u.email}
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </p>
      {u.auth_provider ? (
        <p className="text-xs text-gray-500">登入方式：{u.auth_provider}</p>
      ) : null}
      {u.phone ? <p className="text-xs text-gray-600 dark:text-gray-400">電話：{u.phone}</p> : null}
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
              <div className="mt-2">{renderContact(u)}</div>
            </div>
            {renderMeta(u)}
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              {renderActions(u)}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block dark:bg-gray-900">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">用戶</th>
              <th className="px-4 py-3 text-left">電郵／聯絡</th>
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
                <td className="px-4 py-3">{renderContact(u)}</td>
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
