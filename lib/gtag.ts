'use client';

/**
 * Client-side Google gtag helpers.
 *
 * The base gtag.js script + Consent Mode v2 defaults are loaded by
 * <GoogleTag /> in the root layout. These helpers fire standard
 * ecommerce events via `window.gtag` for Google Ads / GA4.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export interface GAPurchaseParams {
  /** Unique order / transaction id (required). */
  transactionId: string;
  /** Real paid amount, must be > 0. */
  value: number;
  /** ISO 4217 currency code, e.g. "SAR", "EUR", "GBP". */
  currency: string;
  /** Optional product context for richer reporting. */
  items?: {
    id: string;
    name?: string;
    quantity?: number;
    price?: number;
  }[];
}

/**
 * Fire a Google `purchase` event for a successful order.
 *
 * This is the standard GA4 ecommerce event that Google Ads uses for
 * conversion tracking (with dynamic value) when the Google Ads tag is
 * configured to count conversions on `purchase`.
 *
 * No-op when gtag isn't loaded or the value is invalid (must be > 0),
 * so analytics never breaks the checkout flow.
 */
export function trackGAPurchase(params: GAPurchaseParams) {
  if (typeof window === 'undefined' || !window.gtag) return;
  if (!params.transactionId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;
  if (!params.currency) return;

  window.gtag('event', 'purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    ...(params.items ? { items: params.items } : {}),
  });
}

export interface GAConversionParams {
  /** Google Ads conversion label, e.g. "AW-18346838035/IrGvCLu7_NUcEJOQuqxE". */
  sendTo: string;
  /** Unique order / transaction id (prevents duplicate conversions). */
  transactionId: string;
  /** Real paid amount, must be > 0. */
  value: number;
  /** ISO 4217 currency code, e.g. "SAR", "EGP", "GBP". */
  currency: string;
}

/**
 * Fire a Google Ads `conversion` event for a successful order.
 *
 * This is the dedicated Google Ads conversion event (separate from the
 * GA4 `purchase` ecommerce event). The `transaction_id` is sent so
 * Google can deduplicate conversions if the success page is refreshed
 * or reopened.
 *
 * Only call this after the server has confirmed the payment is
 * successful — never on failed/cancelled payments or merely from
 * opening the success URL.
 *
 * No-op when gtag isn't loaded or the value is invalid (must be > 0),
 * so analytics never breaks the checkout flow.
 */
export function trackGAConversion(params: GAConversionParams) {
  if (typeof window === 'undefined' || !window.gtag) return;
  if (!params.sendTo) return;
  if (!params.transactionId) return;
  if (typeof params.value !== 'number' || params.value <= 0) return;
  if (!params.currency) return;

  window.gtag('event', 'conversion', {
    send_to: params.sendTo,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transactionId,
  });
}
