import { checkRef, isDefaultRef, realRef, REF_COOKIE, REF_COOKIE_MARK, refCookieOptions } from './referral';

/** What keepRef needs of a request and a response (NextRequest and NextResponse have them). */
interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
  nextUrl: { searchParams: URLSearchParams };
}
interface ResponseLike {
  cookies: { set(name: string, value: string, options?: Record<string, unknown>): unknown };
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
export async function keepRef<R extends ResponseLike>(request: RequestLike, response: R): Promise<R> {
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
