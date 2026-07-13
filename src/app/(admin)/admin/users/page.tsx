import { UserRoleManager } from '@/components/admin/user-role-manager';
import { listAdminUsers } from '@/lib/admin/users';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await listAdminUsers(100);
  const courierCount = users.filter((u) => u.capabilities.length > 0).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">用戶與角色</h1>
      <p className="text-sm text-gray-500 mb-2">
        平台角色（買家 / 商家 / 管理員）與配送能力（送餐員 / 送貨員）分開管理，可並存。
      </p>
      <p className="text-sm text-gray-500 mb-6">
        共 {users.length} 位用戶，其中 {courierCount} 位具配送能力 · 僅全權管理員可修改 ·
        電郵來自登入帳號（含 Google），電話來自配送員／收貨地址／商家聯絡資料
      </p>
      <UserRoleManager users={users} />
    </div>
  );
}
