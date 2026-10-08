import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { checkRef, isDefaultRef, realRef, REF_COOKIE, REF_COOKIE_MARK, refCookieOptions } from './lib/referral';

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

/**
 * Keeps the customer's referral code in a cookie this server sets (see
 * lib/referral.ts):
 *   - a real code already kept stays (the first real code sticks); one the
 *     browser itself set before is set again by the server, so Safari does not
 *     cut it short;
 *   - otherwise a real code in the link, once the backend knows it, is kept;
 *   - the default code is never kept, and an old one is removed.
 */
async function keepRef(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    const kept = request.cookies.get(REF_COOKIE)?.value;
    const keptReal = realRef(kept);
    if (keptReal) {
      if (!request.cookies.get(REF_COOKIE_MARK)?.value) {
        response.cookies.set(REF_COOKIE, keptReal, refCookieOptions());
        response.cookies.set(REF_COOKIE_MARK, '1', refCookieOptions());
      }
      return response;
    }
    if (kept && isDefaultRef(kept)) {
      response.cookies.set(REF_COOKIE, '', { ...refCookieOptions(), maxAge: 0 });
    }
    const linkRef = realRef(request.nextUrl.searchParams.get('ref'));
    const backend = process.env.BACKEND_URL;
    if (linkRef && backend) {
      const checked = await checkRef(linkRef, backend.replace(/\/+$/, ''), 1500);
      if (checked) {
        response.cookies.set(REF_COOKIE, checked, refCookieOptions());
        response.cookies.set(REF_COOKIE_MARK, '1', refCookieOptions());
      }
    }
  } catch {
    // The code is kept by the page instead (components/providers/referral-provider.tsx).
  }
  return response;
}

export default async function middleware(request: NextRequest) {
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
