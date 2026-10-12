'use client';

import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';

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
export function ShareExperienceProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const preview = useSyncExternalStore(noSubscribe, readPreview, () => false);
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ enabled: enabled || preview, open }), [enabled, preview, open]);

  return (
    <Context.Provider value={value}>
      {children}
      {isOpen ? <ShareExperienceDialog onClose={() => setOpen(false)} /> : null}
    </Context.Provider>
  );
}

export function useShareExperience() {
  return useContext(Context);
}
