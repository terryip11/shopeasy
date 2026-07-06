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

// Category icons mapping
const categoryIcons: Record<string, string> = {
  electronics: '⚡',
  fashion: '👕',
  home: '🏠',
  beauty: '✨',
  sports: '⚽',
  books: '📚',
  food: '🍔',
  toys: '🧸',
};

const categoryColors: Record<string, string> = {
  electronics: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
  fashion: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
  home: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
  beauty: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
  sports: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
  books: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
  food: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
  toys: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20',
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

