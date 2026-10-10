import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { keepRef } from './lib/referral-keep';

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

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const localePattern = /^\/[a-z]{2}(\/|$)/;
  const normalizedPathname = pathname.replace(localePattern, '') || '/';

  // The language the visitor chose stays until he changes it himself (owner, 2026-10-10): an address
  // in the other language (an ad, a shared link, a search result) opens in his language instead. The
  // toggle writes this cookie before it moves to the new language, so switching is never undone here.
  const chosen = request.cookies.get(routing.localeCookie ? (routing.localeCookie as { name: string }).name : '')?.value;
  const urlLocale = pathname.match(/^\/(ar|en)(?=\/|$)/)?.[1];
  if (
    urlLocale &&
    chosen &&
    chosen !== urlLocale &&
    (routing.locales as readonly string[]).includes(chosen)
  ) {
    const target = request.nextUrl.clone();
    target.pathname = `/${chosen}${pathname.slice(urlLocale.length + 1)}`;
    return keepRef(request, NextResponse.redirect(target, 307));
  }

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

    return keepRef(request, response);
  }

  // Auth pages
  if (hasSession && isAuthPage(normalizedPathname)) {
    const locale = pathname.match(localePattern)?.[0].split('/')[1];

    const homeUrl = new URL(locale ? `/${locale}` : '/', request.url);

    const response = NextResponse.redirect(homeUrl);
    syncClientAuthCookie(response, hasSession, hasClientAuthCookie);

    return keepRef(request, response);
  }

  // Run next-intl middleware
  const response = intlMiddleware(request);

  syncClientAuthCookie(response, hasSession, hasClientAuthCookie);

  return keepRef(request, response);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
