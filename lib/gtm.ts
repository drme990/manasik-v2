'use client';

/**
 * Google Tag Manager dataLayer helpers.
 *
 * Pushes ecommerce events to `window.dataLayer` so GTM can relay them
 * to Google Ads, GA4, etc. Uses the GA4 ecommerce event format.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GTMItem {
  item_id: string;
  item_name: string;
  quantity: number;
  price?: number;
}

export interface GTMEcommerceParams {
  transaction_id?: string;
  value?: number;
  currency?: string;
  items: GTMItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pushToDataLayer(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!window.dataLayer) window.dataLayer = [];
  try {
    window.dataLayer.push(event);
  } catch {
    // analytics must never break the app
  }
}

// ─── Event helpers ───────────────────────────────────────────────────────────

export function gtmViewContent(params: GTMEcommerceParams) {
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  });
}

export function gtmAddToCart(params: GTMEcommerceParams) {
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  });
}

export function gtmBeginCheckout(params: GTMEcommerceParams) {
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  });
}

export function gtmPurchase(params: GTMEcommerceParams) {
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: params.transaction_id,
      currency: params.currency,
      value: params.value,
      items: params.items,
    },
  });
}
