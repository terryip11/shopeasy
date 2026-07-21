import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/lib/auth/permissions';
import { isAdminRole, canAccessAdminRoute, isPromoter } from '@/lib/auth/permissions';
import { resolvePostLoginPath } from '@/lib/auth/post-login';

/** 手機買家造訪行銷首頁時改導向購物 feed */
function isMobileBuyerUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
}

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[middleware] 讀取 profiles 失敗:', error.message);
    return null;
  }

  return (data?.role as UserRole) ?? null;
}

function pathNeedsRoleCheck(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/promoter') ||
    pathname.startsWith('/api/merchant') ||
    pathname.startsWith('/api/promoter') ||
    pathname === '/login' ||
    pathname === '/signup'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' && isMobileBuyerUserAgent(request.headers.get('user-agent'))) {
    const productsUrl = request.nextUrl.clone();
    productsUrl.pathname = '/products';
    return NextResponse.redirect(productsUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 讀 cookie 內的 session，不打 Supabase Auth API（避免 429 / 節省配額）
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const needsAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/courier') ||
    pathname.startsWith('/promoter') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/merchant/apply') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/checkout') ||
    pathname.startsWith('/api/merchant') ||
    pathname.startsWith('/api/promoter') ||
    pathname.startsWith('/api/orders') ||
    pathname.startsWith('/api/courier') ||
    pathname.startsWith('/api/payout');

  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role =
    user && pathNeedsRoleCheck(pathname)
      ? await getUserRole(supabase, user.id)
      : null;

  if (user && pathname.startsWith('/admin')) {
    if (!isAdminRole(role) || !canAccessAdminRoute(role, pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (
    user &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/api/merchant')) &&
    !pathname.startsWith('/api/merchant/apply') &&
    role !== 'merchant' &&
    role !== 'super_admin'
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (
    user &&
    (pathname.startsWith('/promoter') || pathname.startsWith('/api/promoter')) &&
    !pathname.startsWith('/api/promoter/apply') &&
    !isPromoter(role) &&
    role !== 'super_admin'
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const destination = resolvePostLoginPath(role, '/');
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/admin',
    '/admin/:path*',
    '/dashboard/:path*',
    '/courier',
    '/courier/:path*',
    '/promoter',
    '/promoter/:path*',
    '/orders/:path*',
    '/account',
    '/account/:path*',
    '/merchant/apply',
    '/api/upload/:path*',
    '/api/admin/:path*',
    '/api/checkout',
    '/api/merchant/:path*',
    '/api/promoter/:path*',
    '/api/orders/:path*',
    '/api/courier/:path*',
    '/api/payout/:path*',
    '/login',
    '/signup',
  ],
};
