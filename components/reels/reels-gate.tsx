'use client';

import { useEffect, useState } from 'react';

/**
 * Shows its reels when the «experience-reels» switch is on, or — before it is — when the address carries
 * ?reels=preview, so the owner can look first (owner, 2026-10-16). Nothing otherwise.
 */
export default function ReelsGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (enabled) return;
    const id = requestAnimationFrame(() => setPreview(new URLSearchParams(window.location.search).get('reels') === 'preview'));
    return () => cancelAnimationFrame(id);
  }, [enabled]);
  return enabled || preview ? <>{children}</> : null;
}
