'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  isAdminNavItemActive,
  type AdminNavSection,
} from '@/lib/admin/nav-config';

type Props = {
  sections: AdminNavSection[];
  onNavigate?: () => void;
  className?: string;
};

export function AdminNavLinks({ sections, onNavigate, className }: Props) {
  const pathname = usePathname();

  return (
    <div className={cn('space-y-6', className)}>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = isAdminNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'nav-link-interactive block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-orange-100 text-orange-800 shadow-sm dark:bg-orange-900/40 dark:text-orange-200'
                        : section.accent
                          ? 'text-orange-700 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
