import { getAuthUser, getProfile } from '@/lib/auth/server';
import { getCourierProfile } from '@/lib/courier/server';
import { Navbar, type NavbarAuthState } from '@/components/marketing/navbar';
import type { UserRole } from '@/lib/auth/permissions';

/**
 * 與頁面主資料並行預熱 Navbar auth（依賴 React.cache 去重）。
 * 在 await 頁面資料前呼叫，可避免「先頁面後 Navbar」串行。
 */
export async function prefetchSiteNavbarAuth() {
  const user = await getAuthUser();
  if (!user) return;
  await Promise.all([
    getProfile(),
    getCourierProfile(user.id).catch(() => null),
  ]);
}

/**
 * Server 版導覽列：預先注入登入狀態，減少首屏等待 /api/me。
 * 僅供 Server Component 頁面使用。
 */
export async function SiteNavbar() {
  const user = await getAuthUser();

  let initialAuth: NavbarAuthState = {
    loggedIn: false,
    role: null,
    displayName: null,
    email: null,
    courierStatus: null,
  };

  if (user) {
    const [profile, courier] = await Promise.all([
      getProfile(),
      getCourierProfile(user.id).catch(() => null),
    ]);
    initialAuth = {
      loggedIn: true,
      role: (profile?.role as UserRole | undefined) ?? null,
      displayName: profile?.display_name?.trim() || null,
      email: user.email ?? null,
      courierStatus: courier?.status ?? null,
    };
  }

  return <Navbar initialAuth={initialAuth} />;
}
