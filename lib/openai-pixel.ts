'use client';

/**
 * Client-side OpenAI Pixel (oaiq) helpers.
 *
 * The base pixel script (oaiq.min.js) is loaded by <OpenAIPixel /> in the
 * root layout. These helpers fire events via `window.oaiq` for client-side
 * tracking (order_created, etc.).
 *
 * For server-side deduplication each helper also POSTs the same event to
 * `/api/openai-event` so the OpenAI Events API receives it too.
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

export interface OpenAIPixelParams {
  type?: string;
  value?: number;
  currency?: string;
  order_id?: string;
  content_ids?: string[];
  content_name?: string;
  num_items?: number;
}

// ─── Pixel (client-side) ─────────────────────────────────────────────────────

/** Fire an OpenAI Pixel event. */
export function oaiqMeasure(
  event: string,
  params?: OpenAIPixelParams,
) {
  if (typeof window === 'undefined' || !window.oaiq) return;
  try {
    window.oaiq('measure', event, params ?? { type: 'contents' });
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
    customData?: Record<string, unknown>;
  },
) {
  try {
    await fetch('/api/openai-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: event,
        event_id: opts?.eventId,
        event_source_url: window.location.href,
        user_data: opts?.userData ?? {},
        custom_data: opts?.customData ?? {},
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
  pixelParams?: OpenAIPixelParams,
  opts?: {
    eventId?: string;
    userData?: Record<string, string>;
  },
) {
  const eventId =
    opts?.eventId ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // 1. Client-side pixel
  oaiqMeasure(event, pixelParams);

  // 2. Server-side Events API (fire-and-forget)
  oaiqCapiBridge(event, {
    eventId,
    userData: opts?.userData,
    customData: pixelParams as Record<string, unknown>,
  });
}

/**
 * Fire the OpenAI `order_created` event (Purchase equivalent).
 * Only call this after the server has confirmed the payment is successful.
 */
export function oaiqPurchase(
  params: {
    value: number;
    currency: string;
    orderId: string;
    productId?: string;
    productName?: string;
    quantity?: number;
  },
) {
  if (!params.orderId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;

  trackOpenAIEvent(
    'order_created',
    {
      type: 'contents',
      value: params.value,
      currency: params.currency,
      order_id: params.orderId,
      content_ids: params.productId ? [params.productId] : undefined,
      content_name: params.productName,
      num_items: params.quantity,
    },
    { eventId: params.orderId },
  );
}
