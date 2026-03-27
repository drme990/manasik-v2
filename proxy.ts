import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/user/settings',
  '/user/orders',
  '/user/order-history',
];
const protectedExact = ['/orders'];
const authPages = ['/auth/login', '/auth/register'];

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('manasik-token')?.value);

  if (!hasSession && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (hasSession && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
