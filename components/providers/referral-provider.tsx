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

  if (!normalized || normalized.length > MAX_REF_LENGTH) {
    return undefined;
  }

  return normalized;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookieValue(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie =
    `${name}=${encodeURIComponent(value)}; ` +
    `path=/; ` +
    `max-age=${COOKIE_MAX_AGE_SECONDS}; ` +
    `samesite=lax`;
}

function persistReferralId(rawRef: string): void {
  const normalizedRef = normalizeRef(rawRef);

  if (!normalizedRef || typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, normalizedRef);
  } catch {
    // localStorage may be unavailable
  }

  setCookieValue(COOKIE_KEY, normalizedRef);
}

function readStoredReferralId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  let localValue: string | null = null;

  try {
    localValue = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }

  const cookieValue = getCookieValue(COOKIE_KEY);

  const normalizedLocal = normalizeRef(localValue);
  const normalizedCookie = normalizeRef(cookieValue);

  // localStorage has priority
  const finalRef = normalizedLocal || normalizedCookie;

  if (!finalRef) {
    return undefined;
  }

  // Keep both synced always
  persistReferralId(finalRef);

  return finalRef;
}

/**
 * Returns the locked referral ID.
 *
 * Rules:
 * - First ref wins forever
 * - Existing stored ref always has priority
 * - localStorage + cookie stay synced
 */
export function getStoredReferral(urlRef?: string | null): string | undefined {
  // Existing stored ref always wins
  const storedRef = readStoredReferralId();

  if (storedRef) {
    persistReferralId(storedRef);

    return storedRef;
  }

  // First visit only
  const normalizedUrlRef = normalizeRef(urlRef);

  if (normalizedUrlRef) {
    persistReferralId(normalizedUrlRef);

    return normalizedUrlRef;
  }

  return undefined;
}

/**
 * Captures and locks the first `?ref=`
 * then keeps it in the URL forever.
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
    if (!pathname) {
      return;
    }

    const urlRef = normalizeRef(searchParams.get('ref'));

    // Existing stored ref wins forever
    const finalRef = getStoredReferral(urlRef);

    if (!finalRef) {
      return;
    }

    // URL already correct
    if (urlRef === finalRef) {
      return;
    }

    // Force URL back to original ref
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set('ref', finalRef);

    router.replace(`${pathname}?${nextParams.toString()}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return <>{children}</>;
}
