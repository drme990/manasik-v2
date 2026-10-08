'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/session';
import { checkRef, realRef, REF_COOKIE, REF_EVENT, REF_STORAGE_KEY } from '@/lib/referral';

/**
 * The customer's referral code in the browser (the rules are in
 * lib/referral.ts).
 *
 * The server keeps the code in a cookie (proxy.ts, app/api/ref): the first
 * real code sticks, the default code is never kept. This provider:
 *   - keeps a copy of the real code in localStorage, and gives it back to the
 *     server when the cookie is gone (Safari clears cookies the page set);
 *   - keeps a real code from the link when the server could not check it;
 *   - follows the signed-in customer's account: the account's real code is
 *     what counts (the backend gives the account the browser's real code
 *     first, if it had none);
 *   - writes the real code in the address, so it travels when the page is
 *     opened in another browser (from Facebook's or Instagram's to Safari or
 *     Chrome).
 * It sends REF_EVENT when the code is known or changes (the WhatsApp button
 * listens).
 */

function cookieRef(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  return realRef(match ? match[1] : '');
}

function storedRef(): string {
  try {
    return realRef(localStorage.getItem(REF_STORAGE_KEY));
  } catch {
    return '';
  }
}

function storeCopy(ref: string): void {
  try {
    if (ref) localStorage.setItem(REF_STORAGE_KEY, ref);
    // An old default copy is not kept.
    else if (localStorage.getItem(REF_STORAGE_KEY)) localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

/** The account's code, once the session has been read (signed-in customers only). */
let accountRef = '';

/**
 * The customer's real code as this browser knows it: the account's, then the
 * kept cookie, then the browser's copy. With no real code known, a real code
 * in the link (`urlRef`) is given, for the backend to check. null when none:
 * the backend then gives the default.
 */
export function getStoredReferral(urlRef?: string | null): string | null {
  return accountRef || cookieRef() || storedRef() || realRef(urlRef) || null;
}

/** Asks the server to keep a code (see app/api/ref); returns the code kept now, or null when it could not be asked. */
async function keepOnServer(ref: string, from: 'account' | 'link'): Promise<string | null> {
  try {
    const res = await fetch('/api/ref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, from }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { ref?: string } | null;
    return data ? realRef(data.ref) : null;
  } catch {
    return null;
  }
}

let announced = '';
function announce(ref: string): void {
  if (ref === announced) return;
  announced = ref;
  window.dispatchEvent(new CustomEvent(REF_EVENT, { detail: { ref } }));
}

export default function ReferralProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    // Writes the code in the address without reloading the page.
    const showInAddress = (ref: string) => {
      const params = new URLSearchParams(window.location.search);
      const current = params.get('ref');
      if (ref) {
        if (current === ref) return;
        params.set('ref', ref);
      } else {
        // An old default code in the address is taken out; anything else is left for the server to judge.
        if (!current || realRef(current)) return;
        params.delete('ref');
      }
      const query = params.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };

    const settle = async () => {
      let ref = cookieRef() || storedRef();
      if (ref) {
        showInAddress(ref);
        announce(ref);
      }

      // 1. The cookie is gone but the browser's copy is there (or the reverse): give it back to the server.
      if (ref && !cookieRef()) {
        const kept = await keepOnServer(ref, 'link');
        if (cancelled) return;
        if (kept) ref = kept;
      }

      // 2. No real code yet: one in the link is kept once the backend knows it.
      //    (proxy.ts normally did this already; this is for when it could not check it.)
      const linkRef = realRef(searchParams.get('ref'));
      if (!ref && linkRef) {
        const checked = await checkRef(linkRef);
        if (cancelled) return;
        if (checked) {
          ref = (await keepOnServer(checked, 'link')) || checked;
          if (cancelled) return;
        }
      }

      // 3. A signed-in customer: his account's real code is what counts. The session request
      //    carries the cookie, so an account that had no real code takes this browser's first.
      const { user } = await getSession();
      if (cancelled) return;
      const ofAccount = realRef(typeof user?.ref === 'string' ? user.ref : '');
      accountRef = ofAccount;
      if (ofAccount && ofAccount !== cookieRef()) {
        await keepOnServer(ofAccount, 'account');
        if (cancelled) return;
      }
      if (ofAccount) ref = ofAccount;

      storeCopy(ref);
      showInAddress(ref);
      announce(ref);
    };

    void settle();

    const onAuthChanged = () => {
      accountRef = '';
      void settle();
    };
    window.addEventListener('auth-changed', onAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('auth-changed', onAuthChanged);
    };
  }, [searchParams]);

  return <>{children}</>;
}
