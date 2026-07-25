'use client';

/**
 * Google Consent Mode v2 client helpers (persistence + gtag updates).
 *
 * The region list and country check live in `lib/consent-regions.ts`
 * so they can be shared with server-rendered components.
 */

import {
  CONSENT_REQUIRED_REGIONS,
  isConsentRequiredCountry,
} from '@/lib/consent-regions';

export { CONSENT_REQUIRED_REGIONS, isConsentRequiredCountry };

const CONSENT_STORAGE_KEY = 'manasik-consent';
// 12 months — Google's recommended maximum retention for consent signals.
const CONSENT_TTL_DAYS = 365;

export type ConsentState = 'granted' | 'denied' | 'unknown';

export interface ConsentChoice {
  ad_storage: ConsentState;
  analytics_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
  decidedAt: string; // ISO timestamp
}

const ALL_GRANTED: ConsentChoice = {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  decidedAt: new Date(0).toISOString(),
};

const ALL_DENIED: ConsentChoice = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  decidedAt: new Date(0).toISOString(),
};

// ─── gtag typings ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Push a Google Consent Mode v2 update to gtag. */
function pushConsentUpdate(choice: ConsentChoice) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    ad_storage: choice.ad_storage,
    analytics_storage: choice.analytics_storage,
    ad_user_data: choice.ad_user_data,
    ad_personalization: choice.ad_personalization,
  });
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function readStoredChoice(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (
      parsed.ad_storage !== 'granted' &&
      parsed.ad_storage !== 'denied'
    ) {
      return null;
    }
    return {
      ad_storage: parsed.ad_storage,
      analytics_storage:
        parsed.analytics_storage === 'granted' ? 'granted' : 'denied',
      ad_user_data:
        parsed.ad_user_data === 'granted' ? 'granted' : 'denied',
      ad_personalization:
        parsed.ad_personalization === 'granted' ? 'granted' : 'denied',
      decidedAt: parsed.decidedAt || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStoredChoice(choice: ConsentChoice) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
    // Also set a cookie so server-side code can read it later if needed.
    const expires = `; max-age=${CONSENT_TTL_DAYS * 24 * 60 * 60}; path=/`;
    document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(
      JSON.stringify(choice),
    )}${expires}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function isExpired(decidedAt: string): boolean {
  const ts = Date.parse(decidedAt);
  if (isNaN(ts)) return true;
  const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return ageDays > CONSENT_TTL_DAYS;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the user's stored consent choice, or `null` if they haven't
 * decided yet (or the stored choice has expired).
 */
export function getStoredConsent(): ConsentChoice | null {
  const stored = readStoredChoice();
  if (!stored) return null;
  if (isExpired(stored.decidedAt)) return null;
  return stored;
}

/**
 * Apply a previously stored consent choice to Google Consent Mode.
 * Called on mount so returning users keep their preferences.
 */
export function applyStoredConsent(): void {
  const stored = getStoredConsent();
  if (stored) pushConsentUpdate(stored);
}

/** User accepted all cookies — persist + push to gtag. */
export function grantAllConsent(): ConsentChoice {
  const choice: ConsentChoice = {
    ...ALL_GRANTED,
    decidedAt: new Date().toISOString(),
  };
  writeStoredChoice(choice);
  pushConsentUpdate(choice);
  return choice;
}

/** User rejected ad/analytics cookies — persist + push to gtag. */
export function denyAllConsent(): ConsentChoice {
  const choice: ConsentChoice = {
    ...ALL_DENIED,
    decidedAt: new Date().toISOString(),
  };
  writeStoredChoice(choice);
  pushConsentUpdate(choice);
  return choice;
}
