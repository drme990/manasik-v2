import { NextRequest, NextResponse } from 'next/server';
import { checkRef, realRef, REF_COOKIE, REF_COOKIE_MARK, refCookieOptions } from '@/lib/referral';

export const dynamic = 'force-dynamic';

/**
 * The page asks the server to keep the customer's referral code (see
 * lib/referral.ts), so it is kept in a cookie the server set:
 *   - from: 'account' — the code of the signed-in customer's account, which
 *     the backend already holds; it is what counts, so it is kept as it is;
 *   - from: 'link' — a code from a link or the browser's copy; kept only when
 *     no real code is kept yet (the first real code sticks), and only once
 *     the backend knows it.
 * Answers with the code kept now ('' for none).
 */
export async function POST(request: NextRequest) {
  let body: { ref?: unknown; from?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const asked = realRef(body.ref);
  const kept = realRef(request.cookies.get(REF_COOKIE)?.value);
  const fromAccount = body.from === 'account';
  let next = kept;
  if (asked && fromAccount) next = asked;
  else if (asked && !kept) {
    const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
    const checked = backend ? await checkRef(asked, backend, 2500) : null;
    if (checked) next = checked;
  }
  const response = NextResponse.json({ ref: next }, { headers: { 'Cache-Control': 'no-store' } });
  if (next && (next !== kept || !request.cookies.get(REF_COOKIE_MARK)?.value)) {
    response.cookies.set(REF_COOKIE, next, refCookieOptions());
    response.cookies.set(REF_COOKIE_MARK, '1', refCookieOptions());
  }
  return response;
}
