'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A row of cards that keeps moving, and that the finger can take (owner, 2026-10-16/17): touching a card stops its
 * row for as long as the finger stays down; while it is down, moving it left or right moves the row with it; lifting
 * it lets the row move on by itself from where it was left. A page scroll (a vertical move) is the browser's, as
 * always, and lets the row go. With a real mouse the row also rests while the pointer is over it.
 *
 * The cards are repeated so the row never runs out (as react-fast-marquee's autoFill did); one transform per frame,
 * nothing re-renders while it moves.
 */
export default function DragMarquee({
  children,
  direction,
  speed = 40,
  play = true,
  pauseOnHover = false,
}: {
  children: ReactNode;
  direction: 'left' | 'right';
  /** Pixels per second. */
  speed?: number;
  play?: boolean;
  pauseOnHover?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const x = useRef(0);
  const width = useRef(0);
  const [copies, setCopies] = useState(2);
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(false);
  const drag = useRef<{ id: number; last: number; moved: number } | null>(null);
  /** The last press moved the row: the click that follows it does not open a card. */
  const moved = useRef(false);

  const draw = useCallback(() => {
    const w = width.current;
    if (w > 0) {
      // Kept within one copy's width to the left: every copy is the same, so the jump is never seen.
      const mod = ((x.current % w) + w) % w;
      x.current = mod - w;
    }
    if (track.current) track.current.style.transform = `translate3d(${x.current}px,0,0)`;
  }, []);

  // How wide one set of cards is, and how many sets fill the row and one more.
  useLayoutEffect(() => {
    const g = group.current;
    const b = box.current;
    if (!g || !b) return;
    const measure = () => {
      width.current = g.getBoundingClientRect().width;
      const need = width.current > 0 ? Math.ceil(b.clientWidth / width.current) + 1 : 2;
      setCopies((c) => (c === Math.max(2, need) ? c : Math.max(2, need)));
      draw();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(g);
    ro.observe(b);
    return () => ro.disconnect();
  }, [draw]);

  const moving = play && !held && !(pauseOnHover && hover);
  useEffect(() => {
    if (!moving) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      x.current += (direction === 'left' ? -1 : 1) * speed * dt;
      draw();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [moving, direction, speed, draw]);

  const release = (id: number) => {
    if (drag.current?.id !== id) return;
    drag.current = null;
    setHeld(false);
  };

  return (
    <div
      ref={box}
      dir="ltr"
      className="relative w-full overflow-hidden select-none [-webkit-touch-callout:none]"
      // Vertical moves scroll the page; sideways moves are the row's.
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag.current = { id: e.pointerId, last: e.clientX, moved: 0 };
        setHeld(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.last;
        d.last = e.clientX;
        d.moved += Math.abs(dx);
        // A touch already stays with the card it started on; a mouse is kept for the row once it drags.
        if (e.pointerType === 'mouse' && d.moved > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        x.current += dx;
        draw();
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => {
        // Only the row's own capture ending (a card handing a touch over is not the finger lifting).
        if (e.target === e.currentTarget) release(e.pointerId);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setHover(false);
        if (e.pointerType === 'mouse' && !e.currentTarget.hasPointerCapture(e.pointerId)) release(e.pointerId);
      }}
      // A card dragged is not also opened (its product links).
      onClickCapture={(e) => {
        if (moved.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDownCapture={() => {
        moved.current = false;
      }}
      onPointerUpCapture={() => {
        moved.current = (drag.current?.moved ?? 0) > 6;
      }}
      onContextMenu={(e) => {
        if (held) e.preventDefault();
      }}
    >
      <div ref={track} className="flex w-max will-change-transform">
        {Array.from({ length: copies }, (_, i) => (
          <div key={i} ref={i === 0 ? group : undefined} className="flex shrink-0" aria-hidden={i > 0 ? true : undefined} inert={i > 0 ? true : undefined}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

