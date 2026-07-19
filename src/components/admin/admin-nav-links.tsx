'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, ListOrdered, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isAdminNavItemActive,
  type AdminNavSection,
} from '@/lib/admin/nav-config';
import { useAdminNavOrder } from '@/hooks/use-admin-nav-order';
import { Button } from '@/components/ui/button';

type Props = {
  sections: AdminNavSection[];
  onNavigate?: () => void;
  className?: string;
};

export function AdminNavLinks({ sections: defaultSections, onNavigate, className }: Props) {
  const pathname = usePathname();
  const {
    sections,
    editing,
    setEditing,
    moveItem,
    moveSection,
    resetOrder,
    hasCustomOrder,
  } = useAdminNavOrder(defaultSections);

  return (
    <div className={cn('space-y-6', className)}>
      {sections.map((section, sectionIndex) => (
        <div key={section.id}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {section.title}
            </p>
            {editing && sections.length > 1 && (
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-700"
                  disabled={sectionIndex === 0}
                  aria-label={`上移「${section.title}」區塊`}
                  onClick={() => moveSection(section.id, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-gray-700"
                  disabled={sectionIndex === sections.length - 1}
                  aria-label={`下移「${section.title}」區塊`}
                  onClick={() => moveSection(section.id, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <ul className="space-y-1">
            {section.items.map((item, itemIndex) => {
              const active = isAdminNavItemActive(pathname, item.href);
              return (
                <li key={item.href} className="flex items-stretch gap-1">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'nav-link-interactive min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-orange-100 text-orange-800 shadow-sm dark:bg-orange-900/40 dark:text-orange-200'
                        : section.accent
                          ? 'text-orange-700 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {item.label}
                  </Link>
                  {editing && (
                    <div className="flex shrink-0 flex-col justify-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-gray-700"
                        disabled={itemIndex === 0}
                        aria-label={`上移「${item.label}」`}
                        onClick={() => moveItem(section.id, item.href, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-gray-700"
                        disabled={itemIndex === section.items.length - 1}
                        aria-label={`下移「${item.label}」`}
                        onClick={() => moveItem(section.id, item.href, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button
          type="button"
          variant={editing ? 'default' : 'outline'}
          size="sm"
          className="w-full justify-center gap-1.5"
          onClick={() => setEditing((v) => !v)}
        >
          <ListOrdered className="h-4 w-4" />
          {editing ? '完成調整' : '調整選單順序'}
        </Button>
        {editing && hasCustomOrder && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-1.5 text-gray-500"
            onClick={resetOrder}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            還原預設順序
          </Button>
        )}
        {editing && (
          <p className="text-center text-[11px] leading-relaxed text-gray-400">
            用上下箭頭調整項目或區塊；順序只保存在此瀏覽器。
          </p>
        )}
      </div>
    </div>
  );
}
