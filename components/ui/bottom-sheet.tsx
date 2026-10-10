'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * A sheet that rises from the bottom of the screen on a phone (and sits as a card in the middle on a wide screen):
 * a handle to drag it down, its title with a close key, the content (scrolls when long), and its keys at the
 * bottom, always in view. Closed by the key, a tap outside, Esc, or a drag down. Drawn at the top of the page.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  label,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** for screen readers when the title is not plain text */
  label?: string;
}) {
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; t: number } | null>(null);

  // stays on screen while it slides away
  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setShown(false);
      setLeaving(false);
      setDrag(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, shown]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    // the page behind stays still (on the root: body's own horizontal clip stays in force)
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a,input')) return;
    start.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current) setDrag(Math.max(0, e.clientY - start.current.y));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const v = dy / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    setDrag(0);
    if (dy > 110 || (dy > 30 && v > 0.55)) close();
  };

  if (!shown || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`bsheet-root fixed inset-0 z-[150] md:flex md:items-center md:justify-center md:p-6 ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : undefined)}>
      <button type="button" aria-hidden tabIndex={-1} onClick={close} className="bsheet-back absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[3px]" />
      <div
        className="bsheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[28px] bg-background shadow-[0_-20px_60px_rgba(0,0,0,.35)] ring-1 ring-foreground/10 md:relative md:inset-auto md:max-h-[86dvh] md:rounded-[28px]"
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div className="shrink-0 touch-none select-none px-5 pb-2 pt-2" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-foreground/20 md:hidden" />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-xl font-bold leading-tight text-foreground">{title}</div>
            <button
              type="button"
              onClick={close}
              aria-label="close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2" data-lenis-prevent>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-foreground/10 bg-background px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        ) : null}
      </div>
      <style>{`
        .bsheet{animation:bsheet-up .44s cubic-bezier(.32,.72,0,1) both;transition:transform .3s cubic-bezier(.32,.72,0,1)}
        .bsheet-back{animation:bsheet-fade .3s ease-out both}
        .is-leaving .bsheet{animation:bsheet-down .28s cubic-bezier(.4,0,1,1) both}
        .is-leaving .bsheet-back{animation:bsheet-unfade .28s ease-in both}
        @keyframes bsheet-up{from{transform:translateY(100%)}to{transform:none}}
        @keyframes bsheet-down{from{transform:none}to{transform:translateY(105%)}}
        @media (min-width:768px){
          @keyframes bsheet-up{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
          @keyframes bsheet-down{from{opacity:1;transform:none}to{opacity:0;transform:translateY(24px) scale(.97)}}
        }
        @keyframes bsheet-fade{from{opacity:0}to{opacity:1}}
        @keyframes bsheet-unfade{from{opacity:1}to{opacity:0}}
        @media (prefers-reduced-motion:reduce){.bsheet,.bsheet-back,.is-leaving .bsheet,.is-leaving .bsheet-back{animation-duration:.01s}}
      `}</style>
    </div>,
    document.body,
  );
}
