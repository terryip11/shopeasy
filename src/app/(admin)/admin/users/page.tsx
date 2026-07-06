import { createAdminClient } from '@/lib/supabase/admin';
import { UserRoleManager, type AdminUserRow } from '@/components/admin/user-role-manager';
import type { UserCapability } from '@/lib/auth/capabilities';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: capabilities }, { data: couriers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('user_capabilities').select('user_id, capability'),
    supabase.from('courier_profiles').select('user_id, status'),
  ]);

  const capsByUser = new Map<string, UserCapability[]>();
  for (const row of capabilities || []) {
    const r = row as { user_id: string; capability: UserCapability };
    const list = capsByUser.get(r.user_id) || [];
    list.push(r.capability);
    capsByUser.set(r.user_id, list);
  }

  const courierByUser = new Map<string, string>();
  for (const row of couriers || []) {
    const r = row as { user_id: string; status: string };
    courierByUser.set(r.user_id, r.status);
  }

  const users: AdminUserRow[] = ((profiles || []) as Omit<AdminUserRow, 'capabilities' | 'courier_status'>[]).map(
    (p) => ({
      ...p,
      capabilities: capsByUser.get(p.id) || [],
      courier_status: courierByUser.get(p.id) ?? null,
    })
  );

  const courierCount = users.filter((u) => u.capabilities.length > 0).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">用戶與角色</h1>
      <p className="text-sm text-gray-500 mb-2">
        平台角色（買家 / 商家 / 管理員）與配送能力（送餐員 / 送貨員）分開管理，可並存。
      </p>
      <p className="text-sm text-gray-500 mb-6">
        共 {users.length} 位用戶，其中 {courierCount} 位具配送能力 · 僅全權管理員可修改
      </p>
      <UserRoleManager users={users} />
    </div>
  );
}
