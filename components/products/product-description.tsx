'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * The product's description, shown short at first: its first lines, fading out, and «Read more» to open the
 * rest (smoothly). A short description is shown whole, with no key.
 */
export default function ProductDescription({
  html,
  title,
  moreLabel,
  lessLabel,
}: {
  html: string;
  title?: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const COLLAPSED = 200; // px — about six lines
  const box = useRef<HTMLDivElement | null>(null);
  const [full, setFull] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setFull(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  const long = full > COLLAPSED + 60;
  const height = !long ? undefined : open ? full : COLLAPSED;

  return (
    <section className="flex flex-col gap-2">
      {title ? <h2 className="text-lg font-bold text-foreground">{title}</h2> : null}
      <div
        ref={box}
        className="product-content overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(.32,.72,0,1)]"
        style={{
          maxHeight: height,
          WebkitMaskImage: long && !open ? 'linear-gradient(to bottom, #000 55%, transparent)' : undefined,
          maskImage: long && !open ? 'linear-gradient(to bottom, #000 55%, transparent)' : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-success transition-colors hover:bg-success/10"
        >
          {open ? lessLabel : moreLabel}
          <ChevronDown size={16} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
    </section>
  );
}
