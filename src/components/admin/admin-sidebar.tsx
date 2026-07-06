import { getUserRole } from '@/lib/auth/server';
import { isAdminRole } from '@/lib/auth/permissions';
import {
  ADMIN_ROLE_LABELS,
  buildAdminNavSections,
} from '@/lib/admin/nav-config';
import { AdminNavLinks } from '@/components/admin/admin-nav-links';

export async function AdminSidebar() {
  const role = await getUserRole();
  if (!isAdminRole(role)) return null;

  const sections = buildAdminNavSections(role);
  const roleLabel = ADMIN_ROLE_LABELS[role!] || role!;

  return (
    <nav className="rounded-xl bg-white p-5 shadow dark:bg-gray-900 lg:p-6">
      <h2 className="mb-1 text-lg font-semibold">管理後台</h2>
      <p className="mb-4 text-xs text-gray-500">{roleLabel}</p>
      <AdminNavLinks sections={sections} />
    </nav>
  );
}
