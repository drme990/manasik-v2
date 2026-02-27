'use client';

/**
 * Client-side Facebook Pixel helpers.
 *
 * The base pixel script (fbevents.js) is already loaded by
 * <MetaPixel /> in the root layout. These helpers let any client
 * component fire standard/custom events via `window.fbq`.
 *
 * For server-side deduplication each helper also POSTs the same
 * event to `/api/fb-event` so the Conversions API receives it too.
 */

// ─── fbq typings ──────────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FBPixelParams {
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  order_id?: string;
}

// ─── Pixel (client-side) ─────────────────────────────────────────────────────

/** Fire a standard FB Pixel event with optional dedup eventID. */
export function fbPixelTrack(
  eventName: string,
  params?: FBPixelParams,
  eventId?: string,
) {
  if (typeof window === 'undefined' || !window.fbq) return;

  if (eventId) {
    window.fbq('track', eventName, params ?? {}, { eventID: eventId });
  } else {
    window.fbq('track', eventName, params ?? {});
  }
}

// ─── Server bridge (CAPI dedup) ──────────────────────────────────────────────

/**
 * POST the event to our own `/api/fb-event` route so the server can
 * relay it to the Facebook Conversions API with the same `event_id`
 * for deduplication.
 */
export async function fbCapiBridge(
  eventName: string,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
    customData?: Record<string, unknown>;
  },
) {
  try {
    // Read _fbc / _fbp cookies to forward to CAPI
    const cookies = typeof document !== 'undefined' ? document.cookie : '';
    const fbc = cookies.match(/(?:^|;\s*)_fbc=([^;]*)/)?.[1] || '';
    const fbp = cookies.match(/(?:^|;\s*)_fbp=([^;]*)/)?.[1] || '';

    await fetch('/api/fb-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: opts?.eventId,
        event_source_url: window.location.href,
        user_data: { ...opts?.userData, fbc, fbp },
        custom_data: opts?.customData ?? {},
      }),
    });
  } catch {
    // Analytics must never break the app
  }
}

// ─── Combined helper ─────────────────────────────────────────────────────────

/**
 * Fire a pixel event **and** relay it to CAPI in one call.
 * Both sides share the same `eventId` for deduplication.
 */
export function trackEvent(
  eventName: string,
  pixelParams?: FBPixelParams,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
  },
) {
  const eventId =
    opts?.eventId ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // 1. Client-side pixel
  fbPixelTrack(eventName, pixelParams, eventId);

  // 2. Server-side CAPI (fire-and-forget)
  fbCapiBridge(eventName, {
    eventId,
    userData: opts?.userData,
    customData: pixelParams as Record<string, unknown>,
  });
}
