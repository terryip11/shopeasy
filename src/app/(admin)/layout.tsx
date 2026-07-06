import { AdminHeader } from '@/components/admin/admin-header';
import { AdminMobileNavProvider } from '@/components/admin/admin-mobile-nav-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminMobileNavProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AdminHeader />
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </AdminMobileNavProvider>
  );
}
