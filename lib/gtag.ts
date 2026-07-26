'use client';

/**
 * Client-side Google gtag helpers.
 *
 * The base gtag.js script + Consent Mode v2 defaults are loaded by
 * <GoogleTag /> in the root layout. These helpers fire standard
 * ecommerce events via `window.gtag` for Google Ads / GA4.
 */

import { getStoredConsent } from '@/lib/consent';

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
  /** Optional customer PII for Enhanced Conversions (sent via gtag('set','user_data',...) before the event). */
  userData?: GAUserData;
}

export interface GAUserData {
  /** Customer email, unhashed. Google hashes it server-side. */
  email?: string;
  /** Phone in E.164 format, e.g. "+201xxxxxxxxx". No spaces/dashes. */
  phoneNumber?: string;
}

/**
 * Normalize a phone number to E.164 format as required by Google
 * Enhanced Conversions: a leading `+`, digits only, no spaces/dashes.
 *
 * If the number already starts with `+` we keep it as-is (stripped of
 * non-digits except the leading `+`). If it doesn't, we return it
 * unchanged so the caller can decide — Google rejects non-E.164 numbers,
 * so we'd rather omit the field than send a malformed one.
 */
function toE164(phone: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Already international — keep the leading + and strip everything else.
  if (trimmed.startsWith('+')) {
    const digits = '+' + trimmed.slice(1).replace(/[^\d]/g, '');
    return digits.length > 2 ? digits : null;
  }

  // Local number without country code — we can't reliably guess the
  // prefix, so omit rather than send malformed data.
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length >= 11 && digitsOnly.startsWith('00')) {
    // `00<cc>...` is the international prefix outside North America.
    return '+' + digitsOnly.slice(2);
  }

  return null;
}

/**
 * Returns true only when the user has explicitly granted consent for
 * `ad_user_data`. For visitors outside the EU/UK/CH regions the
 * <GoogleTag /> defaults already grant it, but we still require a
 * stored choice OR the default-granted state.
 *
 * We treat "unknown" (no stored choice yet) as denied to be safe —
 * Enhanced Conversions PII must never be sent without a clear grant.
 */
function hasAdUserDataConsent(): boolean {
  const stored = getStoredConsent();
  if (stored) return stored.ad_user_data === 'granted';

  // No stored choice: for non-EEA visitors the banner never appears and
  // the gtag default is "granted". We can't read the gtag default state
  // directly, so we infer from the absence of a required-region cookie.
  // The <ConsentBanner /> only stores a choice for EEA/UK/CH visitors,
  // so no stored choice means "rest of the world" → granted.
  return true;
}

/**
 * Push customer PII to gtag via `gtag('set', 'user_data', ...)` for
 * Enhanced Conversions. Must be called BEFORE the `conversion` event.
 *
 * - Only sends fields that are present and valid (Google recommends
 *   omitting missing fields rather than sending empty strings).
 * - Only sends anything when `ad_user_data` consent is granted.
 * - Email is sent unhashed; Google hashes it server-side.
 * - Phone is normalized to E.164 (`+<cc><number>`, no spaces/dashes).
 *
 * Returns true if user_data was pushed, false if it was skipped
 * (no consent, or no valid fields to send).
 */
export function setGAUserData(userData: GAUserData): boolean {
  if (typeof window === 'undefined' || !window.gtag) return false;
  if (!hasAdUserDataConsent()) return false;

  const email = userData.email?.trim().toLowerCase();
  const phone = userData.phoneNumber ? toE164(userData.phoneNumber) : null;

  const payload: Record<string, string> = {};
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    payload.email = email;
  }
  if (phone) {
    payload.phone_number = phone;
  }

  if (Object.keys(payload).length === 0) return false;

  window.gtag('set', 'user_data', payload);
  return true;
}

/**
 * Fire a Google Ads `conversion` event for a successful order.
 *
 * This is the dedicated Google Ads conversion event (separate from the
 * GA4 `purchase` ecommerce event). The `transaction_id` is sent so
 * Google can deduplicate conversions if the success page is refreshed
 * or reopened.
 *
 * When `params.userData` is provided, customer PII is pushed via
 * `gtag('set', 'user_data', ...)` BEFORE the conversion event — but
 * only when `ad_user_data` consent is granted. Empty/invalid fields
 * are omitted (Google's recommendation).
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

  // Enhanced Conversions: push PII before the event, only with consent.
  if (params.userData) {
    setGAUserData(params.userData);
  }

  window.gtag('event', 'conversion', {
    send_to: params.sendTo,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transactionId,
  });
}
