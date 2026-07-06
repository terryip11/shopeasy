import { getUserRole } from '@/lib/auth/server';
import { isAdminRole } from '@/lib/auth/permissions';
import {
  ADMIN_ROLE_LABELS,
  buildAdminNavSections,
} from '@/lib/admin/nav-config';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminMobileDrawer } from '@/components/admin/admin-mobile-drawer';

export default async function AdminNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();
  const sections = isAdminRole(role) ? buildAdminNavSections(role) : [];
  const roleLabel = role ? ADMIN_ROLE_LABELS[role] || role : '';

  return (
    <>
      {sections.length > 0 && (
        <AdminMobileDrawer sections={sections} roleLabel={roleLabel} />
      )}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-6">
            <AdminSidebar />
          </div>
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </>
  );
}
