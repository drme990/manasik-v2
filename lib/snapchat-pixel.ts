'use client';

/**
 * Client-side Snapchat Pixel helpers.
 *
 * Snapchat does not provide a standard browser pixel script like Meta or
 * TikTok. Instead, we send events from the client to our own
 * `/api/snap-event` bridge route, which relays them to the Snapchat
 * Conversions API server-side. This also avoids ad-blocker interference.
 *
 * For Purchase, the SAME `eventId` (= order number) MUST be used by both
 * the client bridge and the server webhook so Snapchat can deduplicate
 * the two and count the sale only once.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SnapPixelParams {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_category?: string[];
  number_items?: string[];
}

// ─── Server bridge ───────────────────────────────────────────────────────────

/**
 * POST the event to our own `/api/snap-event` route so the server can
 * relay it to the Snapchat Conversions API with the same `event_id`
 * for deduplication.
 */
export async function snapCapiBridge(
  eventName: string,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
    customData?: Record<string, unknown>;
  },
) {
  try {
    // Read Snapchat click ID from URL params or cookies
    const urlParams = new URLSearchParams(window.location.search);
    const scClickId =
      urlParams.get('ScClickID') ||
      document.cookie.match(/(?:^|;\s*)sc_click_id=([^;]*)/)?.[1] ||
      '';
    const scCookie1 =
      document.cookie.match(/(?:^|;\s*)sc_cookie1=([^;]*)/)?.[1] || '';

    const customData = { ...(opts?.customData ?? {}) };
    // Snap expects value as a string ("100.00")
    if (typeof customData.value === 'number') {
      customData.value = String(customData.value);
    }

    await fetch('/api/snap-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: opts?.eventId,
        event_source_url: window.location.href,
        user_data: {
          ...opts?.userData,
          sc_click_id: scClickId,
          sc_cookie1: scCookie1,
        },
        custom_data: customData,
      }),
    });
  } catch {
    // Analytics must never break the app
  }
}

// ─── Combined helper ─────────────────────────────────────────────────────────

/**
 * Relay a Snapchat event to the server Conversions API.
 * Returns immediately (fire-and-forget).
 */
export function trackSnapEvent(
  eventName: string,
  pixelParams?: SnapPixelParams,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
  },
) {
  const eventId =
    opts?.eventId ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  snapCapiBridge(eventName, {
    eventId,
    userData: opts?.userData,
    customData: pixelParams as Record<string, unknown>,
  });
}

/**
 * Fire the Snapchat `PURCHASE` event (client-side bridge).
 * The `orderId` is used as the `event_id` so Snapchat can deduplicate
 * against the same event sent from the server webhook.
 *
 * Only call this after the server has confirmed the payment is successful.
 */
export function snapPurchase(params: {
  productId?: string;
  productName?: string;
  value: number;
  currency: string;
  quantity: number;
  orderId: string;
}) {
  if (!params.orderId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;

  trackSnapEvent(
    'PURCHASE',
    {
      value: params.value,
      currency: params.currency,
      content_ids: params.productId ? [params.productId] : undefined,
      content_category: ['product'],
      number_items: [String(params.quantity)],
    },
    { eventId: params.orderId },
  );
}

/**
 * Fire the Snapchat `ADD_CART` event (client-side bridge).
 */
export function snapAddToCart(params: {
  productId: string;
  productName: string;
  value: number;
  currency: string;
  quantity: number;
}) {
  trackSnapEvent('ADD_CART', {
    value: params.value,
    currency: params.currency,
    content_ids: [params.productId],
    content_category: ['product'],
    number_items: [String(params.quantity)],
  });
}

/**
 * Fire the Snapchat `PAGE_VIEW` event (client-side bridge).
 */
export function snapPageView(params?: {
  productId?: string;
  category?: string;
}) {
  trackSnapEvent('PAGE_VIEW', {
    content_ids: params?.productId ? [params.productId] : undefined,
    content_category: params?.category ? [params.category] : undefined,
  });
}
