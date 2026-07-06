'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { AdminNavSection } from '@/lib/admin/nav-config';
import { AdminNavLinks } from '@/components/admin/admin-nav-links';
import { useAdminMobileNav } from '@/components/admin/admin-mobile-nav-context';
import { Button } from '@/components/ui/button';

type Props = {
  sections: AdminNavSection[];
  roleLabel: string;
};

export function AdminMobileDrawer({ sections, roleLabel }: Props) {
  const { open, setOpen } = useAdminMobileNav();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="關閉選單"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(100vw-3rem,20rem)] flex-col bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">管理後台</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="關閉"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <AdminNavLinks sections={sections} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </div>
  );
}
