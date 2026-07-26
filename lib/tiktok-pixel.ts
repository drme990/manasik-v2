'use client';

/**
 * Client-side TikTok Pixel helpers.
 *
 * The base pixel script is loaded by <TiktokPixel /> in the root layout.
 * These helpers fire standard events via `window.ttq` for client-side
 * tracking (ViewContent, InitiateCheckout) and the browser-side Purchase
 * that pairs with the server-side Events API Purchase for deduplication.
 *
 * For Purchase, the SAME `eventId` (= order number) MUST be used by both
 * the browser Pixel and the server Events API call so TikTok can merge
 * the two and not double-count the sale.
 */

declare global {
  interface Window {
    ttq?: {
      track: (
        event: string,
        params?: Record<string, unknown>,
        eventId?: string,
      ) => void;
      page: () => void;
      // Other methods (identify, instance, etc.) exist but aren't used here.
    } & Record<string, (...args: unknown[]) => void>;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TiktokPixelParams {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  quantity?: number;
  price?: number;
  value?: number;
  currency?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True when the TikTok pixel (`ttq`) is loaded on the page. */
function isTtqReady(): boolean {
  return typeof window !== 'undefined' && !!window.ttq;
}

/**
 * Fire a TikTok Pixel event with optional dedup `eventId`.
 * No-op when ttq isn't loaded, so analytics never breaks the app.
 */
export function ttqTrack(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (!isTtqReady()) return;
  try {
    window.ttq!.track(event, params ?? {}, eventId);
  } catch {
    // ignore — analytics must never break the app
  }
}

/** Fire `ViewContent` when a product detail page is viewed. */
export function ttqViewContent(
  params: {
    productId: string;
    productName: string;
    value: number;
    currency: string;
  },
  eventId?: string,
) {
  ttqTrack(
    'ViewContent',
    {
      content_id: params.productId,
      content_type: 'product',
      content_name: params.productName,
      value: params.value,
      currency: params.currency,
    },
    eventId,
  );
}

/** Fire `InitiateCheckout` when the checkout page loads. */
export function ttqInitiateCheckout(
  params: {
    productId: string;
    productName: string;
    value: number;
    currency: string;
    quantity: number;
  },
  eventId?: string,
) {
  ttqTrack(
    'InitiateCheckout',
    {
      content_id: params.productId,
      content_type: 'product',
      content_name: params.productName,
      quantity: params.quantity,
      value: params.value,
      currency: params.currency,
    },
    eventId,
  );
}

/**
 * Fire the browser-side TikTok `CompletePayment` (Purchase) event.
 *
 * The `eventId` MUST be the unique order number — the server-side
 * Events API call uses the same value as its `event_id`, so TikTok
 * can deduplicate the two and count the sale only once.
 *
 * Only call this after the server has confirmed the payment is
 * successful. No-op when ttq isn't loaded or value is invalid.
 */
export function ttqPurchase(
  params: {
    productId: string;
    productName: string;
    value: number;
    currency: string;
    quantity: number;
    /** Unique order id — used for Pixel/Events API deduplication. */
    orderId: string;
  },
) {
  if (!isTtqReady()) return;
  if (!params.orderId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;

  try {
    window.ttq!.track(
      'CompletePayment',
      {
        content_id: params.productId,
        content_type: 'product',
        content_name: params.productName,
        quantity: params.quantity,
        value: params.value,
        currency: params.currency,
      },
      params.orderId, // event_id for dedup with server Events API
    );
  } catch {
    // ignore
  }
}
