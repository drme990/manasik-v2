'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'manasik-ref';
const COOKIE_KEY = 'manasik-ref';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const MAX_REF_LENGTH = 128;

function normalizeRef(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;

  const normalized = raw.trim();
  if (!normalized || normalized.length > MAX_REF_LENGTH) return undefined;

  return normalized;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookieValue(name: string, value: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function persistReferralId(rawRef: string): void {
  const normalizedRef = normalizeRef(rawRef);
  if (!normalizedRef || typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, normalizedRef);
  } catch {
    // localStorage may be unavailable in private browsing contexts.
  }

  setCookieValue(COOKIE_KEY, normalizedRef);
}

function readStoredReferralId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  let localPrimary: string | null = null;

  try {
    localPrimary = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable in private browsing contexts.
  }

  const candidate = [localPrimary, getCookieValue(COOKIE_KEY)]
    .map(normalizeRef)
    .find(Boolean);

  if (!candidate) return undefined;
  return candidate;
}

function readReferralIdFromCurrentUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const currentSearch = new URLSearchParams(window.location.search);
  return normalizeRef(currentSearch.get('ref'));
}

/**
 * Captures `?ref=` from any page URL, persists it, and restores it
 * to the query string when users continue browsing without it.
 */
export default function ReferralProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const queryRef = normalizeRef(searchParams.get('ref'));
    if (queryRef) {
      persistReferralId(queryRef);
      return;
    }

    const storedRef = readStoredReferralId();
    if (!storedRef || !pathname) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('ref', storedRef);

    router.replace(`${pathname}?${nextParams.toString()}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return <>{children}</>;
}

/** Read the stored referral ID (URL param takes priority, then storage/cookie fallback). */
export function getStoredReferral(urlRef: string | null): string | undefined {
  const queryRef = normalizeRef(urlRef);
  if (queryRef) {
    persistReferralId(queryRef);
    return queryRef;
  }

  const currentUrlRef = readReferralIdFromCurrentUrl();
  if (currentUrlRef) {
    persistReferralId(currentUrlRef);
    return currentUrlRef;
  }

  return readStoredReferralId();
}
