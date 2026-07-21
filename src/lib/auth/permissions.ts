/**

 * 角色與 Admin 權限定義

 */



export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin' | 'accountant' | 'promoter';



export type AdminPermission =

  | 'categories:read'

  | 'categories:write'

  | 'categories:delete'

  | 'products:read'

  | 'products:write'

  | 'products:delete'

  | 'merchants:read'

  | 'merchants:approve'

  | 'merchants:suspend'

  | 'merchants:delete'

  | 'orders:read'

  | 'orders:manage'

  | 'couriers:read'

  | 'couriers:manage'

  | 'finance:read'

  | 'finance:write'

  | 'users:read'

  | 'users:manage'

  | 'audit:read';



/** 營運管理員權限 */

export const REGULAR_ADMIN_PERMISSIONS: AdminPermission[] = [

  'categories:read',

  'categories:write',

  'products:read',

  'products:write',

  'merchants:read',

  'merchants:approve',

  'orders:read',

  'couriers:read',

  'couriers:manage',

];



/** 會計員權限：財務 + 訂單唯讀 */

export const ACCOUNTANT_PERMISSIONS: AdminPermission[] = [

  'finance:read',

  'finance:write',

  'orders:read',

];



/** 可進入 /admin 後台的角色 */

export const BACKOFFICE_ROLES: UserRole[] = ['admin', 'super_admin', 'accountant'];



/** 營運 API（requireAdmin） */

export const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin'];



/** 財務 API */

export const FINANCE_ROLES: UserRole[] = ['super_admin', 'accountant'];



const ACCOUNTANT_ROUTE_PREFIXES = ['/admin/finance', '/admin/revenue', '/admin/orders'];



const SUPER_ADMIN_ONLY_PREFIXES = [

  '/admin/users',

  '/admin/audit',

  '/admin/usage',

  '/admin/landing',

  '/admin/monetization',

  '/admin/system',

  '/admin/merchants',

  '/admin/categories',

  '/admin/products',

  '/admin/orders/trace',

  '/admin/affiliate',

];



export function isAccountant(role: UserRole | null | undefined): boolean {

  return role === 'accountant';

}



export function isPromoter(role: UserRole | null | undefined): boolean {

  return role === 'promoter';

}



export function isAdminRole(role: UserRole | null | undefined): boolean {

  return role != null && BACKOFFICE_ROLES.includes(role);

}



export function isSuperAdmin(role: UserRole | null | undefined): boolean {

  return role === 'super_admin';

}



export function canManageFinance(role: UserRole | null | undefined): boolean {

  return role != null && FINANCE_ROLES.includes(role);

}



export function hasPermission(

  role: UserRole | null | undefined,

  permission: AdminPermission

): boolean {

  if (role === 'super_admin') return true;

  if (role === 'accountant') return ACCOUNTANT_PERMISSIONS.includes(permission);

  if (role === 'admin') return REGULAR_ADMIN_PERMISSIONS.includes(permission);

  return false;

}



export function canAccessAdminRoute(role: UserRole | null | undefined, pathname: string): boolean {

  if (!isAdminRole(role)) return false;

  if (isSuperAdmin(role)) return true;



  if (isAccountant(role)) {
    if (pathname === '/admin') return true;
    if (pathname.startsWith('/admin/orders/trace')) return false;
    return ACCOUNTANT_ROUTE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
  }



  if (SUPER_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {

    return false;

  }



  if (pathname.startsWith('/admin/finance') || pathname.startsWith('/admin/revenue')) {

    return false;

  }



  return true;

}



/** 資料表 CRUD 對應權限 */

export function tableActionPermission(

  table: string,

  action: 'read' | 'create' | 'update' | 'delete'

): AdminPermission | null {

  const map: Record<string, Record<string, AdminPermission>> = {

    categories: {

      read: 'categories:read',

      create: 'categories:write',

      update: 'categories:write',

      delete: 'categories:delete',

    },

    products: {

      read: 'products:read',

      create: 'products:write',

      update: 'products:write',

      delete: 'products:delete',

    },

    merchants: {

      read: 'merchants:read',

      create: 'merchants:delete',

      update: 'merchants:suspend',

      delete: 'merchants:delete',

    },

    orders: {

      read: 'orders:read',

      create: 'orders:manage',

      update: 'orders:manage',

      delete: 'orders:manage',

    },

  };

  return map[table]?.[action] ?? null;

}


