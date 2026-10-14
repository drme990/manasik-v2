/**
 * What the Meta pixel is told about consent before it starts.
 *
 * Since 2026-10-01 the pixel no longer records visitors from the EU, the UK and
 * Switzerland unless it is told their consent (`fbq('consent', 'grant')`): for
 * those visitors it stopped writing its `_fbp` cookie and Meta stopped seeing
 * their landing page views and purchases, so the ads could not learn from
 * Europe any more. The site already asks these visitors through the cookie
 * banner (Google Consent Mode); the pixel now follows the same answer.
 *
 * Pure module (no client-only APIs): used by the server layout to write the
 * pixel's first call, and by the banner on the client.
 */

import { isConsentRequiredCountry } from '@/lib/consent-regions';

export type MetaConsent = 'grant' | 'revoke';

/** The cookie the banner writes next to localStorage (lib/consent.ts). */
export const CONSENT_COOKIE_NAME = 'manasik-consent';

// 12 months — the same retention as the stored choice in lib/consent.ts.
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The visitor's stored banner choice for advertising storage, read from the
 * cookie value as the browser sends it (raw or URL-encoded JSON).
 * `null` when there is no valid, unexpired choice.
 */
export function storedAdConsent(
  cookieValue: string | null | undefined,
  now: number = Date.now(),
): 'granted' | 'denied' | null {
  if (!cookieValue) return null;
  let parsed: { ad_storage?: unknown; decidedAt?: unknown } | null = null;
  for (const candidate of [cookieValue, safeDecode(cookieValue)]) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate) as unknown;
      if (value && typeof value === 'object') {
        parsed = value as { ad_storage?: unknown; decidedAt?: unknown };
        break;
      }
    } catch {
      // try the next form
    }
  }
  if (!parsed) return null;
  if (parsed.ad_storage !== 'granted' && parsed.ad_storage !== 'denied') {
    return null;
  }
  const decidedAt =
    typeof parsed.decidedAt === 'string' ? Date.parse(parsed.decidedAt) : NaN;
  if (Number.isNaN(decidedAt) || now - decidedAt > CONSENT_TTL_MS) return null;
  return parsed.ad_storage;
}

/**
 * The pixel's first consent call (made before `fbq('init')`):
 * - a stored choice wins: granted → grant, denied → revoke;
 * - no choice yet: a visitor from a consent-required country (EU, UK, CH,
 *   EFTA) → revoke until the banner is answered, as the Google tag already
 *   does; anyone else, or a visitor whose country is not known → grant, as
 *   before. (The banner still finds the country on the client and revokes
 *   when it turns out to be required.)
 */
export function initialMetaConsent(
  countryCode: string | null | undefined,
  cookieValue: string | null | undefined,
  now: number = Date.now(),
): MetaConsent {
  const stored = storedAdConsent(cookieValue, now);
  if (stored === 'granted') return 'grant';
  if (stored === 'denied') return 'revoke';
  return isConsentRequiredCountry(countryCode) ? 'revoke' : 'grant';
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
