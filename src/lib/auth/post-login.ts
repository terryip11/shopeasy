import type { UserRole } from './permissions';
import { isAccountant } from './permissions';

/** 登入成功後的預設導向（僅在未指定具體目標路徑時套用角色預設） */
export function resolvePostLoginPath(
  role: UserRole | null | undefined,
  requestedPath = '/'
): string {
  const pathOnly = (requestedPath.split('?')[0] || '/').replace(/\/$/, '') || '/';
  if (pathOnly !== '/') {
    return requestedPath;
  }
  if (isAccountant(role)) return '/admin/finance';
  if (role === 'admin' || role === 'super_admin') return '/admin';
  if (role === 'merchant') return '/dashboard';
  return requestedPath;
}
