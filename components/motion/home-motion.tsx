'use client';

import { useLayoutEffect } from 'react';

/**
 * The home page's arrivals (owner, 2026-10-09: "make the home a real pleasure — only through motion, entrances and
 * browsing; nothing in the colours or the interface changes").
 *
 * Everything that should arrive carries `data-mo="<kind>"` (see app/[locale]/motion.css). While `html.mo` is set those
 * elements wait, invisible; the moment one comes up into the screen it gets `is-in` and plays its entrance once.
 * Elements that come in together (a row of cards) are numbered in the order they sit on the page (`--mo-i`), so they
 * arrive one after another instead of all at once. A `data-mo-row` container numbers its own children instead: a
 * sideways row arrives as one hand of cards.
 *
 * `html.mo` is put on by a tiny script in <head> before the first paint (layout.tsx), so nothing is ever seen and then
 * hidden. If this script never runs (JS failed), the head script takes `mo` off again after 3 s and the page is
 * simply shown as it is. With reduced motion `mo` is never set: everything is in place from the start.
 */
const STEP_MS = 90;
const MAX_STEPS = 7;

export default function HomeMotion() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      root.classList.remove('mo');
      return;
    }
    root.classList.add('mo', 'mo-live');

    const io = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        arriving.forEach((el, index) => {
          el.style.setProperty('--mo-i', String(Math.min(index, MAX_STEPS)));
          el.style.setProperty('--mo-delay', `${Math.min(index, MAX_STEPS) * STEP_MS}ms`);
          el.classList.add('is-in');
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    );

    const seen = new WeakSet<Element>();
    const watch = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>('[data-mo]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
      scope.querySelectorAll<HTMLElement>('[data-mo-row]').forEach((row) => {
        Array.from(row.children).forEach((child, index) => {
          (child as HTMLElement).style.setProperty('--mo-i', String(Math.min(index, 9)));
        });
      });
    };

    const scope = document.querySelector('.mo-scope');
    if (!scope) return;
    watch(scope);
    // The products, the questions and the reviews arrive after the page (they are asked for): watched as they appear.
    const mo = new MutationObserver(() => watch(scope));
    mo.observe(scope, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('mo', 'mo-live');
    };
  }, []);

  return null;
}
