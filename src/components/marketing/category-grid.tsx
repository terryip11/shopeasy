/**
 * 分類網格元件
 */

import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryGridProps {
  categories: Category[];
}

const categoryIcons: Record<string, string> = {
  food: '🍱',
  'drinks-desserts': '🧋',
  grocery: '🛒',
  electronics: '⚡',
  fashion: '👕',
  beauty: '✨',
  home: '🏠',
  'baby-kids': '👶',
  pets: '🐾',
  sports: '⚽',
  health: '💊',
  gifts: '🎁',
  hobbies: '🧸',
  other: '📦',
};

const categoryColors: Record<string, string> = {
  food: 'from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-800/20',
  'drinks-desserts': 'from-amber-50 to-rose-100 dark:from-amber-900/20 dark:to-rose-800/20',
  grocery: 'from-lime-50 to-green-100 dark:from-lime-900/20 dark:to-green-800/20',
  electronics: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
  fashion: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
  beauty: 'from-fuchsia-50 to-purple-100 dark:from-fuchsia-900/20 dark:to-purple-800/20',
  home: 'from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-800/20',
  'baby-kids': 'from-sky-50 to-cyan-100 dark:from-sky-900/20 dark:to-cyan-800/20',
  pets: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/20',
  sports: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
  health: 'from-teal-50 to-emerald-100 dark:from-teal-900/20 dark:to-emerald-800/20',
  gifts: 'from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-800/20',
  hobbies: 'from-cyan-50 to-indigo-100 dark:from-cyan-900/20 dark:to-indigo-800/20',
  other: 'from-gray-50 to-slate-100 dark:from-gray-800/20 dark:to-slate-700/20',
};

function getCategoryIcon(slug: string): string {
  return categoryIcons[slug] || '📦';
}

function getCategoryColor(slug: string): string {
  return categoryColors[slug] || 'from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20';
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categories/${category.slug}`}
          className={`group flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br ${getCategoryColor(category.slug)} p-6 transition-all hover:scale-105 hover:shadow-lg`}
        >
          <span className="text-4xl transition-transform group-hover:scale-110">
            {getCategoryIcon(category.slug)}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

