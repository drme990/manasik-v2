'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { validateReferral } from '@/lib/api/validateReferral';

const STORAGE_KEY = 'manasik-ref';
const COOKIE_KEY = 'manasik-ref';
const DEFAULT_REF = 'MNK-D';

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

async function syncReferralFromSession(): Promise<string | undefined> {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const response = await fetch('/api/auth/manasik/session', {
      cache: 'no-store',
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = await response.json();
    const sessionRef = normalizeRef(payload?.data?.ref);

    if (sessionRef) {
      persistReferralId(sessionRef);
      return sessionRef;
    }
  } catch {
    // Ignore session sync failures and keep the current stored ref.
  }
  return undefined;
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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const syncAndValidate = async () => {
      // 1. Check local storage ref first for instant URL update
      let currentRef = readStoredReferralId();
      const urlRef = normalizeRef(searchParams.get('ref'));

      if (currentRef) {
        // Instant URL update if local storage already has a ref
        const params = new URLSearchParams(searchParams.toString());
        if (params.get('ref') !== currentRef) {
          params.set('ref', currentRef);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
      }

      // 2. Fetch from DB session in background (DB overwrite all)
      const sessionRef = await syncReferralFromSession();
      if (cancelled) return;

      // Update currentRef if session returned a different one
      if (sessionRef && sessionRef !== currentRef) {
        currentRef = sessionRef;
      }

      // 3. If still no ref is found:
      if (!currentRef) {
        if (urlRef) {
          // Validate the URL ref
          const validation = await validateReferral(urlRef);
          if (cancelled) return;

          if (validation.valid) {
            currentRef = urlRef;
            persistReferralId(urlRef);
          } else {
            currentRef = DEFAULT_REF;
            persistReferralId(DEFAULT_REF);
          }
        } else {
          // No ref in URL, assign default
          currentRef = DEFAULT_REF;
          persistReferralId(DEFAULT_REF);
        }
      }

      // 4. Final sync of URL parameter
      if (currentRef) {
        const params = new URLSearchParams(searchParams.toString());
        if (params.get('ref') !== currentRef) {
          params.set('ref', currentRef);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
      }
    };

    void syncAndValidate();

    const handleAuthChanged = () => {
      void syncAndValidate();
    };

    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, [pathname, searchParams, router]);

  return <>{children}</>;
}
