import { cookies, headers } from 'next/headers';

/**
 * Normalize a raw country code string into a clean 2-letter uppercase code.
 * Returns null for invalid / placeholder values.
 */
function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  // 'XX' and 'ZZ' are placeholder values used by some CDNs/proxies
  if (code === 'XX' || code === 'ZZ') return null;
  // Map Israel → Palestine everywhere in the app.
  return code === 'IL' ? 'PS' : code;
}

/**
 * Resolve the viewer's country code on the server side.
 *
 * Priority order:
 *   1. The home-country cookie (set by CurrencyProvider on previous visits)
 *   2. The `x-vercel-ip-country` request header (Vercel edge)
 *   3. The `cf-ipcountry` request header (Cloudflare)
 *   4. Empty string (the backend will fall back to 'OT')
 *
 * This ensures that even on a first visit — before the client-side
 * CurrencyProvider has set the cookie — the server can still detect
 * the user's country from the request's IP headers and fetch the
 * correct prices.
 *
 * @param cookieName The app-specific home-country cookie name
 *   ('manasik-home-country' or 'ghadaq-home-country')
 */
export async function getViewerCountryCode(
  cookieName: string,
): Promise<string> {
  // 1. Try the cookie first (set on previous visits by CurrencyProvider)
  const cookieStore = await cookies();
  const fromCookie = normalizeCountryCode(cookieStore.get(cookieName)?.value);
  if (fromCookie) return fromCookie;

  // 2. Fall back to IP country headers from the original request
  const headerList = await headers();
  const fromVercel = normalizeCountryCode(
    headerList.get('x-vercel-ip-country'),
  );
  if (fromVercel) return fromVercel;

  const fromCloudflare = normalizeCountryCode(
    headerList.get('cf-ipcountry'),
  );
  if (fromCloudflare) return fromCloudflare;

  // 3. No detection possible — return empty string; the backend will
  //    use its own IP detection or fall back to 'OT'
  return '';
}
