import Link from 'next/link';
import { HOME_SHORTCUTS } from '@/lib/marketing/home-config';

export function ProductsShortcutGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:gap-3">
      {HOME_SHORTCUTS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex flex-col items-center gap-1.5 rounded-xl p-2 active:scale-95 transition-transform"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl md:h-12 md:w-12 ${item.bg}`}
          >
            {item.emoji}
          </div>
          <span className="text-center text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
