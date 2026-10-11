'use client';

/**
 * The website's own visitor id (owner, 2026-10-10 — Meta Conversions API fix): a random id kept in the first-party
 * cookie `mvid` (a year) and in localStorage. The Meta pixel is started with it as `external_id`
 * (components/shared/meta-pixel.tsx, which also creates it before the pixel starts), every event the website relays
 * to the Conversions API carries it, and checkout stores it on the order so the server's Purchase carries it too —
 * so Meta can tie the server's events to the same visitor. It identifies a browser, never a person.
 */

export const VISITOR_ID_COOKIE = 'mvid';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] || undefined;
}

export function getVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let id = readCookie(VISITOR_ID_COOKIE);
    if (!id) {
      try {
        id = localStorage.getItem(VISITOR_ID_COOKIE) || undefined;
      } catch {
        // storage blocked
      }
    }
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).toLowerCase();
    }
    document.cookie = `${VISITOR_ID_COOKIE}=${id}; max-age=31536000; path=/; SameSite=Lax`;
    try {
      localStorage.setItem(VISITOR_ID_COOKIE, id);
    } catch {
      // storage blocked
    }
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Meta's click id: the `_fbc` cookie the pixel keeps, or — before the pixel has written it (the first page of a visit
 * from an ad) — built from the `fbclid` in the address, in Meta's own format.
 */
export function getFbc(): string | undefined {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  if (typeof window === 'undefined') return undefined;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
}
