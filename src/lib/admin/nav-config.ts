import type { UserRole } from '@/lib/auth/permissions';
import { isAccountant, isSuperAdmin } from '@/lib/auth/permissions';

export type AdminNavItem = {
  href: string;
  label: string;
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
  accent?: boolean;
};

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: '全權管理員',
  admin: '營運管理員',
  accountant: '會計員',
};

const opsNav: AdminNavItem[] = [
  { href: '/admin', label: '概覽' },
  { href: '/admin/merchants/pending', label: '商家審核' },
  { href: '/admin/categories', label: '分類管理' },
  { href: '/admin/products', label: '商品管理' },
  { href: '/admin/orders', label: '訂單查詢' },
  { href: '/admin/couriers', label: '配送員管理' },
];

const financeNav: AdminNavItem[] = [
  { href: '/admin/finance', label: '交易財務總覽' },
  { href: '/admin/finance/merchants', label: '商家應付' },
  { href: '/admin/finance/couriers', label: '配送員結算' },
  { href: '/admin/finance/reconciliation', label: '月結對帳' },
  { href: '/admin/revenue', label: '訂閱收入' },
  { href: '/admin/orders', label: '訂單查詢' },
];

const systemNav: AdminNavItem[] = [
  { href: '/admin/usage', label: '平台使用統計' },
  { href: '/admin/merchants', label: '商家管理' },
  { href: '/admin/affiliate', label: '分享推廣系統' },
  { href: '/admin/finance', label: '交易財務' },
  { href: '/admin/revenue', label: '訂閱收入' },
  { href: '/admin/orders/trace', label: '訂單流程追查' },
  { href: '/admin/couriers/zones', label: '配送區域設定' },
  { href: '/admin/users', label: '用戶與角色' },
  { href: '/admin/audit', label: '審計日誌' },
];

export function buildAdminNavSections(role: UserRole | null): AdminNavSection[] {
  if (!role) return [];

  if (isAccountant(role)) {
    return [{ title: '財務', items: financeNav, accent: true }];
  }

  const sections: AdminNavSection[] = [
    { title: '營運', items: opsNav },
  ];

  if (isSuperAdmin(role)) {
    sections.push({ title: '系統', items: systemNav, accent: true });
  }

  return sections;
}

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
