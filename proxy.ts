import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/user/settings',
  '/user/orders',
  '/user/order-history',
];
const protectedExact = ['/orders'];
const authPages = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

function isProtectedPath(pathname: string): boolean {
  if (protectedExact.includes(pathname)) return true;
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  return authPages.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function syncClientAuthCookie(
  response: NextResponse,
  hasToken: boolean,
  hasClientAuthCookie: boolean,
) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (hasToken && !hasClientAuthCookie) {
    response.cookies.set('manasik-auth', '1', {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
  }

  if (!hasToken && hasClientAuthCookie) {
    response.cookies.set('manasik-auth', '', {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 0,
      path: '/',
    });
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('manasik-token')?.value);
  const hasClientAuthCookie = Boolean(
    request.cookies.get('manasik-auth')?.value,
  );

  let response: NextResponse;

  if (!hasSession && isProtectedPath(pathname)) {
    response = NextResponse.redirect(new URL('/auth/login', request.url));
    syncClientAuthCookie(response, hasSession, hasClientAuthCookie);
    return response;
  }

  if (hasSession && isAuthPage(pathname)) {
    response = NextResponse.redirect(new URL('/', request.url));
    syncClientAuthCookie(response, hasSession, hasClientAuthCookie);
    return response;
  }

  response = NextResponse.next();
  syncClientAuthCookie(response, hasSession, hasClientAuthCookie);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
