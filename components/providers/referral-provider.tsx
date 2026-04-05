'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'ref';

/**
 * Captures `?ref=` from any page URL and persists it in localStorage
 * so the checkout page can read it even if the user navigates away.
 */
export default function ReferralProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem(STORAGE_KEY, ref);
    }
  }, [searchParams]);

  return <>{children}</>;
}

/** Read the stored referral ID (URL param takes priority, then localStorage) */
export function getStoredReferral(urlRef: string | null): string | undefined {
  if (urlRef) return urlRef;
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || undefined;
  }
  return undefined;
}
