'use client';

import { useEffect } from 'react';

/**
 * Stops the running strips (react-fast-marquee: the top banner, our work, the reviews) while they are out of sight,
 * and lets them run again just before they come back (owner, 2026-10-10 — lighter pages, nothing changes on
 * screen). Ten strips used to keep turning off-screen, keeping the phone's main thread busy about an eighth of the
 * time even with the page standing still.
 */
export default function MarqueePause() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) el.removeAttribute('data-offscreen');
          else el.setAttribute('data-offscreen', '');
        }
      },
      { rootMargin: '200px 0px' },
    );
    const seen = new WeakSet<Element>();
    const watch = () => {
      document.querySelectorAll('.rfm-marquee-container').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    watch();
    // Strips that arrive later (sections that load their content after the page) are picked up as they appear.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = window.requestAnimationFrame(() => {
        queued = 0;
        watch();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      if (queued) window.cancelAnimationFrame(queued);
    };
  }, []);

  return null;
}
