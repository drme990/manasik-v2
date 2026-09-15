import { headers } from 'next/headers';

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
 * Uses IP headers directly (no cookie) so the server-side render uses
 * the same country source as the checkout POST route. This ensures
 * the display price matches the checkout price.
 *
 * Priority order:
 *   1. The `x-vercel-ip-country` request header (Vercel edge)
 *   2. The `cf-ipcountry` request header (Cloudflare)
 *   3. Empty string (the backend will fall back to 'OT')
 */
export async function getViewerCountryCode(): Promise<string> {
  const headerList = await headers();

  const fromVercel = normalizeCountryCode(
    headerList.get('x-vercel-ip-country'),
  );
  if (fromVercel) return fromVercel;

  const fromCloudflare = normalizeCountryCode(
    headerList.get('cf-ipcountry'),
  );
  if (fromCloudflare) return fromCloudflare;

  // No detection possible — return empty string; the backend will
  // use its own IP detection or fall back to 'OT'
  return '';
}
