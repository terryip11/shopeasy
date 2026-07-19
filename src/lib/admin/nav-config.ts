import type { UserRole } from '@/lib/auth/permissions';
import { isAccountant, isSuperAdmin } from '@/lib/auth/permissions';

export type AdminNavItem = {
  href: string;
  label: string;
};

export type AdminNavSection = {
  /** 穩定鍵，用於本機排序儲存 */
  id: string;
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

/** 會計專用：含訂單查詢入口 */
const accountantFinanceNav: AdminNavItem[] = [
  { href: '/admin/finance', label: '交易財務總覽' },
  { href: '/admin/finance/merchants', label: '商家應付' },
  { href: '/admin/finance/credits', label: '預付餘額' },
  { href: '/admin/finance/couriers', label: '配送員結算' },
  { href: '/admin/finance/reconciliation', label: '月結對帳' },
  { href: '/admin/finance/platform-payout', label: '平台收款設定' },
  { href: '/admin/revenue', label: '訂閱收入' },
  { href: '/admin/orders', label: '訂單查詢' },
];

/** 超管側欄財務區（訂單已在營運） */
const adminFinanceNav: AdminNavItem[] = [
  { href: '/admin/finance', label: '交易財務總覽' },
  { href: '/admin/finance/merchants', label: '商家應付' },
  { href: '/admin/finance/credits', label: '預付餘額' },
  { href: '/admin/finance/couriers', label: '配送員結算' },
  { href: '/admin/finance/reconciliation', label: '月結對帳' },
  { href: '/admin/finance/platform-payout', label: '平台收款設定' },
  { href: '/admin/revenue', label: '訂閱收入' },
];

const systemNav: AdminNavItem[] = [
  { href: '/admin/usage', label: '平台使用統計' },
  { href: '/admin/merchants', label: '商家管理' },
  { href: '/admin/affiliate', label: '分享推廣系統' },
  { href: '/admin/orders/trace', label: '訂單流程追查' },
  { href: '/admin/couriers/zones', label: '配送區域設定' },
  { href: '/admin/users', label: '用戶與角色' },
  { href: '/admin/audit', label: '審計日誌' },
];

export function buildAdminNavSections(role: UserRole | null): AdminNavSection[] {
  if (!role) return [];

  if (isAccountant(role)) {
    return [{ id: 'finance', title: '財務', items: accountantFinanceNav, accent: true }];
  }

  const sections: AdminNavSection[] = [
    { id: 'ops', title: '營運', items: opsNav },
  ];

  if (isSuperAdmin(role)) {
    sections.push(
      { id: 'finance', title: '財務', items: adminFinanceNav, accent: true },
      { id: 'system', title: '系統', items: systemNav }
    );
  }

  return sections;
}

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';

  // 精確／互斥路徑：避免父子連結同時高亮
  if (href === '/admin/finance') {
    return pathname === '/admin/finance';
  }
  if (href === '/admin/merchants/pending') {
    return (
      pathname === '/admin/merchants/pending' ||
      pathname.startsWith('/admin/merchants/pending/')
    );
  }
  if (href === '/admin/merchants') {
    return (
      pathname === '/admin/merchants' ||
      (pathname.startsWith('/admin/merchants/') &&
        !pathname.startsWith('/admin/merchants/pending'))
    );
  }
  if (href === '/admin/orders') {
    return (
      pathname === '/admin/orders' ||
      (pathname.startsWith('/admin/orders/') &&
        !pathname.startsWith('/admin/orders/trace'))
    );
  }
  if (href === '/admin/couriers') {
    return (
      pathname === '/admin/couriers' ||
      (pathname.startsWith('/admin/couriers/') &&
        !pathname.startsWith('/admin/couriers/zones'))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 依本機儲存的順序重排；未知項目接在後面 */
export function applyAdminNavOrder(
  sections: AdminNavSection[],
  stored: { sectionIds?: string[]; itemHrefs?: Record<string, string[]> } | null
): AdminNavSection[] {
  if (!stored) return sections;

  const byId = new Map(sections.map((s) => [s.id, s]));
  const orderedSections: AdminNavSection[] = [];

  for (const id of stored.sectionIds ?? []) {
    const section = byId.get(id);
    if (section) {
      orderedSections.push(section);
      byId.delete(id);
    }
  }
  for (const section of byId.values()) {
    orderedSections.push(section);
  }

  return orderedSections.map((section) => {
    const savedHrefs = stored.itemHrefs?.[section.id];
    if (!savedHrefs?.length) return section;

    const byHref = new Map(section.items.map((i) => [i.href, i]));
    const items: AdminNavItem[] = [];
    for (const href of savedHrefs) {
      const item = byHref.get(href);
      if (item) {
        items.push(item);
        byHref.delete(href);
      }
    }
    for (const item of byHref.values()) {
      items.push(item);
    }
    return { ...section, items };
  });
}
