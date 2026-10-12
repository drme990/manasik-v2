'use client';

import { useEffect } from 'react';

/**
 * On the dashboard «eye» preview only (owner, 2026-10-12): a small mark that
 * the page is not published, and the page keeps its place when the dashboard
 * reloads it after an edit (it reports where it is scrolled to; the dashboard
 * sends it back as ?y=).
 */
export default function PreviewBar({ label, note }: { label: string; note?: string }) {
  useEffect(() => {
    const y = Number(new URLSearchParams(window.location.search).get('y') || 0);
    if (y > 0) {
      // After the page has laid out its images.
      window.requestAnimationFrame(() => window.scrollTo(0, y));
      const late = window.setTimeout(() => window.scrollTo(0, y), 400);
      return () => window.clearTimeout(late);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    let timer = 0;
    const report = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        window.parent.postMessage({ type: 'seo-preview-scroll', y: Math.round(window.scrollY) }, '*');
      }, 150);
    };
    window.addEventListener('scroll', report, { passive: true });
    return () => {
      window.removeEventListener('scroll', report);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-4">
      <div className="rounded-full bg-amber-500/95 px-4 py-1.5 text-center text-xs font-semibold text-white shadow-lg">
        {label}
        {note ? <span className="ms-2 font-normal opacity-90">{note}</span> : null}
      </div>
    </div>
  );
}
