import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

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

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const localePattern = /^\/[a-z]{2}(\/|$)/;
  const normalizedPathname = pathname.replace(localePattern, '') || '/';

  const hasSession = Boolean(request.cookies.get('manasik-token')?.value);
  const hasClientAuthCookie = Boolean(
    request.cookies.get('manasik-auth')?.value,
  );

  // Protected routes
  if (!hasSession && isProtectedPath(normalizedPathname)) {
    const locale = pathname.match(localePattern)?.[0].split('/')[1];

    const loginUrl = new URL(
      locale ? `/${locale}/auth/login` : '/auth/login',
      request.url,
    );

    const response = NextResponse.redirect(loginUrl);
    syncClientAuthCookie(response, hasSession, hasClientAuthCookie);

    return response;
  }

  // Auth pages
  if (hasSession && isAuthPage(normalizedPathname)) {
    const locale = pathname.match(localePattern)?.[0].split('/')[1];

    const homeUrl = new URL(locale ? `/${locale}` : '/', request.url);

    const response = NextResponse.redirect(homeUrl);
    syncClientAuthCookie(response, hasSession, hasClientAuthCookie);

    return response;
  }

  // Run next-intl middleware
  const response = intlMiddleware(request);

  syncClientAuthCookie(response, hasSession, hasClientAuthCookie);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
