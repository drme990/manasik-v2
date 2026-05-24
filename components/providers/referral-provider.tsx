'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { validateReferral } from '@/lib/api/validateReferral';

const STORAGE_KEY = 'manasik-ref';
const COOKIE_KEY = 'manasik-ref';
const DEFAULT_REF = 'default-MNK';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function normalizeRef(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;

  const normalized = raw.trim();

  if (!normalized) {
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

function clearCookieValue(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
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

  if (finalRef === DEFAULT_REF) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }

    clearCookieValue(COOKIE_KEY);
    return undefined;
  }

  // Keep both synced always
  persistReferralId(finalRef);

  return finalRef;
}

async function syncReferralFromSession(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/api/auth/manasik/session', {
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const sessionRef = normalizeRef(payload?.data?.ref);

    if (sessionRef) {
      persistReferralId(sessionRef);
    }
  } catch {
    // Ignore session sync failures and keep the current stored ref.
  }
}

export function getStoredReferral(urlRef?: string | null): string | null {
  const requestedRef = normalizeRef(urlRef);

  if (requestedRef) {
    return requestedRef;
  }

  const storedRef = readStoredReferralId();

  if (storedRef) {
    return storedRef;
  }

  return null;
}

export default function ReferralProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await syncReferralFromSession();

      if (cancelled) {
        return;
      }

      const referralId = normalizeRef(searchParams.get('ref'));

      const existingRef = getStoredReferral();

      if (existingRef) {
        return;
      }

      if (referralId) {
        const validation = await validateReferral(referralId);

        if (cancelled) {
          return;
        }

        if (validation.valid) {
          persistReferralId(referralId);
          return;
        }
      }
    })();

    const handleAuthChanged = () => {
      void syncReferralFromSession();
    };

    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, [searchParams]);

  return <>{children}</>;
}
