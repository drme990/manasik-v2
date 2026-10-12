'use client';

import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { hasClientAuthCookie } from '@/lib/client-auth-cookie';
import { EXPERIENCE_APP } from '@/lib/experience';

// The dialog (recorders and all) is only downloaded when someone opens it.
const ShareExperienceDialog = dynamic(() => import('./share-experience-dialog'), { ssr: false });

interface ShareExperienceContext {
  enabled: boolean;
  open: () => void;
}

const Context = createContext<ShareExperienceContext>({ enabled: false, open: () => undefined });

const PREVIEW_KEY = 'share-experience-preview';

const noSubscribe = () => () => undefined;

/** ?preview-share=1 turns the preview on for the visit, ?preview-share=0 off. */
function readPreview(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get('preview-share');
    if (flag === '1') sessionStorage.setItem(PREVIEW_KEY, '1');
    if (flag === '0') sessionStorage.removeItem(PREVIEW_KEY);
    return sessionStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * «شارك تجربتك» (owner, 2026-10-12). Shown when the switch «share-experience»
 * is on. While it is off, the owner can still try it: open any page with
 * ?preview-share=1 (remembered for the visit).
 */
const DISMISSED_PREFIX = 'share-invite-seen:';
/** Pages where the invitation never opens by itself: paying, signing in, the account's own forms. */
const QUIET_PATHS = /\/(checkout|payment|auth|user\/settings|delete-account)/;

/**
 * «شارك تجربتك» (owner, 2026-10-12). Shown when the switch «share-experience»
 * is on. While it is off, the owner can still try it: open any page with
 * ?preview-share=1 (remembered for the visit).
 *
 * With «experience-prompt» on, a signed-in customer whose fully paid order is
 * a day old (see the backend) gets the window once, by itself, with a thank-you
 * header; closing it means it doesn't come back for that order. A link with
 * ?share=1 (the invitation email) opens it too.
 */
export function ShareExperienceProvider({
  enabled,
  promptEnabled = false,
  children,
}: {
  enabled: boolean;
  promptEnabled?: boolean;
  children: React.ReactNode;
}) {
  const preview = useSyncExternalStore(noSubscribe, readPreview, () => false);
  const [isOpen, setOpen] = useState(false);
  const [invited, setInvited] = useState(false);
  const inviteKeyRef = useRef('');
  const checkedRef = useRef(false);
  const pathname = usePathname();
  const active = enabled || preview;

  const open = useCallback(() => {
    setInvited(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!active || checkedRef.current) return;
    let fromLink = false;
    try {
      fromLink = new URLSearchParams(window.location.search).get('share') === '1';
    } catch {
      fromLink = false;
    }
    if (fromLink) {
      const timer = window.setTimeout(() => {
        checkedRef.current = true;
        setInvited(true);
        setOpen(true);
      }, 400);
      return () => window.clearTimeout(timer);
    }
    if (!promptEnabled || !hasClientAuthCookie() || QUIET_PATHS.test(pathname || '')) return;
    const timer = window.setTimeout(() => {
      checkedRef.current = true;
      fetch(`/api/customer/${EXPERIENCE_APP}/experiences`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const key = data?.data?.invite ? String(data.data.inviteKey || '') : '';
          if (!key) return;
          try {
            if (localStorage.getItem(DISMISSED_PREFIX + key)) return;
          } catch {
            return;
          }
          inviteKeyRef.current = key;
          setInvited(true);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [active, promptEnabled, pathname]);

  const close = useCallback(() => {
    setOpen(false);
    if (inviteKeyRef.current) {
      try {
        localStorage.setItem(DISMISSED_PREFIX + inviteKeyRef.current, '1');
      } catch {
        // Private mode: it may come back on the next visit, which is acceptable.
      }
      inviteKeyRef.current = '';
    }
  }, []);

  const value = useMemo(() => ({ enabled: active, open }), [active, open]);

  return (
    <Context.Provider value={value}>
      {children}
      {isOpen ? <ShareExperienceDialog onClose={close} invited={invited} /> : null}
    </Context.Provider>
  );
}

export function useShareExperience() {
  return useContext(Context);
}
