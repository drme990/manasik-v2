/**
 * The customer's referral code (ref) on this website: the rules shared by the
 * page proxy, the /api/ref route and the browser.
 *
 * The rule the owner set: the first real code a customer comes with (m1, m2,
 * m3...: an employee's link) sticks to him for good. The default code
 * (MNK-D) is for customers who came by themselves and never sticks: it is
 * never kept, so the first real code that reaches him later takes its place.
 * The backend applies the same rule to his account.
 *
 * The code is kept in a cookie the website's server sets (the browser's own
 * cookies and storage are cut short by Safari, to 7 days or one day after a
 * Facebook link); the backend reads that cookie with the checkout, sign-up,
 * sign-in and session requests.
 */

export const APP_ID = 'manasik' as const;
export const DEFAULT_REF = 'MNK-D';
export const REF_COOKIE = 'manasik-ref';
/** Says the code cookie was set by the server (so not cut short); one without it is set again. */
export const REF_COOKIE_MARK = 'manasik-ref-s';
/** Where the browser keeps a copy, in case the cookie is gone. */
export const REF_STORAGE_KEY = 'manasik-ref';
/** Sent through the page when the customer's code becomes known or changes. */
export const REF_EVENT = 'ref-changed';

/** Browsers keep a cookie at most 400 days. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function refCookieOptions() {
  return {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    // The page reads it (the WhatsApp button, the checkout); it holds nothing secret.
    httpOnly: false,
  };
}

/** A code as it can be written in a link: letters, digits, '-' and '_'. Anything else is not a code. */
export function cleanRef(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let value = raw.trim();
  try {
    value = decodeURIComponent(value).trim();
  } catch {
    // keep as it is
  }
  return /^[A-Za-z0-9_-]{1,40}$/.test(value) ? value : '';
}

export function isDefaultRef(raw: unknown): boolean {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return value === 'MNK-D' || value === 'GHD-D';
}

/** A real code: a code, and not a default one. */
export function realRef(raw: unknown): string {
  const value = cleanRef(raw);
  return value && !isDefaultRef(value) ? value : '';
}

/**
 * Checks a code with the backend. Returns the code as it is kept there when it
 * is a real code of this site, '' when it is not one, and null when the check
 * could not be made (the network): then nothing is decided.
 */
export async function checkRef(ref: string, baseUrl = '', timeoutMs = 2500): Promise<string | null> {
  const value = realRef(ref);
  if (!value) return '';
  try {
    const res = await fetch(`${baseUrl}/api/referral/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: value, appId: APP_ID }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { valid?: boolean; referralId?: string } | null;
    if (!data || typeof data.valid !== 'boolean') return null;
    if (!data.valid) return '';
    return realRef(data.referralId) || value;
  } catch {
    return null;
  }
}
