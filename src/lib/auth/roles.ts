/**
 * 角色定義與路由權限
 */

export type { UserRole, AdminPermission } from './permissions';
export {
  ADMIN_ROLES,
  BACKOFFICE_ROLES,
  FINANCE_ROLES,
  isAdminRole,
  isSuperAdmin,
  isAccountant,
  canManageFinance,
  hasPermission,
  canAccessAdminRoute,
  REGULAR_ADMIN_PERMISSIONS,
  ACCOUNTANT_PERMISSIONS,
} from './permissions';

export { resolvePostLoginPath } from './post-login';

import type { UserRole } from './permissions';
import { isAdminRole, canAccessAdminRoute } from './permissions';

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  if (pathname.startsWith('/admin')) {
    return isAdminRole(role) && canAccessAdminRoute(role, pathname);
  }
  if (pathname.startsWith('/dashboard')) {
    return role === 'merchant' || role === 'super_admin';
  }
  return true;
}
