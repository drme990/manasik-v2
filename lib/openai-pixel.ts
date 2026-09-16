'use client';

/**
 * Client-side OpenAI Pixel (oaiq) helpers.
 *
 * The base pixel script (oaiq.min.js) is loaded by <OpenAIPixel /> in the
 * root layout. These helpers fire events via `window.oaiq` for client-side
 * tracking (order_created, etc.).
 *
 * Official signature (developers.openai.com/ads):
 *   oaiq("measure", "order_created",
 *     { type: "contents", amount: 8900, currency: "USD" },
 *     { event_id: "order_12345" });
 *
 * `amount` is an integer in the currency's minor unit (8900 = $89.00).
 * The 4th `event_id` arg is required for dedup with the server-side
 * Conversions API event (which uses the same id).
 */

// ─── oaiq typings ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    oaiq?: ((...args: unknown[]) => void) & {
      q?: unknown[][];
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenAIContentItem {
  id?: string;
  name?: string;
  content_type?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
}

export interface OpenAIPixelData {
  type: 'contents' | 'customer_action' | 'plan_enrollment' | 'custom';
  /** Monetary value in minor units (e.g. 8900 for $89.00). */
  amount?: number;
  currency?: string;
  contents?: OpenAIContentItem[];
  [key: string]: unknown;
}

// ─── Pixel (client-side) ─────────────────────────────────────────────────────

/** Fire an OpenAI Pixel event. */
export function oaiqMeasure(
  event: string,
  data?: OpenAIPixelData,
  eventId?: string,
) {
  if (typeof window === 'undefined' || !window.oaiq) return;
  try {
    window.oaiq(
      'measure',
      event,
      data ?? { type: 'contents' },
      eventId ? { event_id: eventId } : {},
    );
  } catch {
    // analytics must never break the app
  }
}

// ─── Server bridge (dedup) ───────────────────────────────────────────────────

/**
 * POST the event to our own `/api/openai-event` route so the server can
 * relay it to the OpenAI Events API with the same event id for
 * deduplication.
 */
export async function oaiqCapiBridge(
  event: string,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
    data?: Record<string, unknown>;
  },
) {
  try {
    // Forward the __obref first-party cookie for click matching.
    const obref =
      typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|;\s*)__obref=([^;]*)/)?.[1] || ''
        : '';

    await fetch('/api/openai-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: event,
        event_id: opts?.eventId,
        event_source_url: window.location.href,
        user_data: { ...(opts?.userData ?? {}), obref },
        custom_data: opts?.data ?? {},
      }),
    });
  } catch {
    // analytics must never break the app
  }
}

// ─── Combined helper ─────────────────────────────────────────────────────────

/**
 * Fire a pixel event **and** relay it to the server Events API in one call.
 * Both sides share the same `eventId` for deduplication.
 */
export function trackOpenAIEvent(
  event: string,
  data?: OpenAIPixelData,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
  },
) {
  const eventId =
    opts?.eventId ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // 1. Client-side pixel
  oaiqMeasure(event, data, eventId);

  // 2. Server-side Events API (fire-and-forget)
  oaiqCapiBridge(event, {
    eventId,
    userData: opts?.userData,
    data: data as Record<string, unknown>,
  });
}

/**
 * Fire the OpenAI `order_created` event (Purchase equivalent).
 * Only call this after the server has confirmed the payment is successful.
 */
export function oaiqPurchase(params: {
  value: number;
  currency: string;
  orderId: string;
  productId?: string;
  productName?: string;
  quantity?: number;
}) {
  if (!params.orderId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;

  const amount = Math.round(params.value * 100); // minor units

  trackOpenAIEvent(
    'order_created',
    {
      type: 'contents',
      amount,
      currency: params.currency,
      contents: [
        {
          id: params.productId,
          name: params.productName,
          content_type: 'product',
          quantity: params.quantity ?? 1,
          amount,
          currency: params.currency,
        },
      ],
    },
    { eventId: params.orderId },
  );
}
