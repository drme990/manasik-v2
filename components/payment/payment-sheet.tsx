'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ExternalLink, Lock, X } from 'lucide-react';

/**
 * The payment page (EasyKash) opened in a sheet that rises from the bottom of the site, instead of leaving the
 * site for it. Nothing about the payment changes: the same page, the same link, the same return to
 * /payment/status. When the payment page comes back to the site, the sheet hands over to that page at full size.
 *
 * Safety first: the server checks first that the payment page allows being shown inside the site; if it does not
 * (or the check fails or is slow), the site goes to the payment page exactly as before. In the sheet, a key opens
 * the same page at full size at any time.
 */

const TEXT = {
  ar: {
    title: 'الدفع الآمن',
    sub: 'دفع مشفّر عبر EasyKash',
    full: 'صفحة كاملة',
    close: 'إغلاق',
    loading: 'جارٍ تحميل صفحة الدفع الآمنة…',
  },
  en: {
    title: 'Secure payment',
    sub: 'Encrypted payment by EasyKash',
    full: 'Full page',
    close: 'Close',
    loading: 'Loading the secure payment page…',
  },
};

const isReturnPage = (path: string) => /\/payment\/status(\/|$)/.test(path);

function Sheet({ url, onGone }: { url: string; onGone: () => void }) {
  const lang = (typeof document !== 'undefined' && document.documentElement.lang === 'en') ? 'en' : 'ar';
  const t = TEXT[lang];
  const [leaving, setLeaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag] = useState(0);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const start = useRef<{ y: number; t: number } | null>(null);
  const done = useRef(false);

  const pushed = useRef(false);
  const close = useCallback((fromBack = false) => {
    if (leaving) return;
    setLeaving(true);
    // the step the sheet added to the browser's history goes with it (the phone's Back closes the sheet)
    if (!fromBack && pushed.current && window.history.state?.paySheet) window.history.back();
    pushed.current = false;
    window.setTimeout(onGone, 300);
  }, [leaving, onGone]);

  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), paySheet: 1 }, '');
    pushed.current = true;
    const onPop = () => {
      if (pushed.current && !done.current) close(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // once, when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the page behind stays still; Esc closes
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [close]);

  // the payment page came back to the site (/payment/status): that page takes the whole window, at once,
  // before it starts inside the sheet
  useEffect(() => {
    const look = () => {
      if (done.current) return;
      try {
        const loc = frame.current?.contentWindow?.location;
        if (loc && loc.origin === window.location.origin && isReturnPage(loc.pathname)) {
          done.current = true;
          window.location.href = loc.href;
        }
      } catch {
        // still on the payment page (another site): nothing to read
      }
    };
    const timer = window.setInterval(look, 150);
    return () => window.clearInterval(timer);
  }, []);

  // dragged down by its handle or head to close
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    start.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag(Math.max(0, e.clientY - start.current.y));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const v = dy / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    if (dy > 140 || (dy > 40 && v > 0.6)) close();
    else setDrag(0);
  };

  return (
    <div className={`pay-sheet-root fixed inset-0 z-[200] ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label={t.title}>
      <button type="button" aria-label={t.close} onClick={() => close()} className="pay-sheet-back absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[3px]" />

      <div
        className="pay-sheet absolute inset-x-0 bottom-0 mx-auto flex h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-background shadow-[0_-20px_60px_rgba(0,0,0,.35)] md:bottom-4 md:h-[88dvh] md:rounded-[28px]"
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        {/* the head: dragged to close */}
        <div
          className="shrink-0 touch-none select-none border-b border-foreground/10 px-4 pb-3 pt-2"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span aria-hidden className="mx-auto mb-2 block h-1.5 w-11 rounded-full bg-foreground/20" />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Lock size={20} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight text-foreground">{t.title}</p>
              <p className="mt-0.5 truncate text-xs text-secondary">{t.sub}</p>
            </div>
            <a
              href={url}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-secondary transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ExternalLink size={14} />
              {t.full}
            </a>
            <button
              type="button"
              onClick={() => close()}
              aria-label={t.close}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* the payment page itself */}
        <div className="relative min-h-0 flex-1 bg-white">
          <iframe
            ref={frame}
            src={url}
            title={t.title}
            allow="payment *; clipboard-write"
            className="absolute inset-0 h-full w-full border-0"
            onLoad={() => setLoaded(true)}
          />
          <div
            aria-hidden={loaded}
            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
          >
            <span className="pay-sheet-spin h-10 w-10 rounded-full border-[3px] border-primary/20 border-t-primary" />
            <p className="text-sm text-secondary">{t.loading}</p>
          </div>
        </div>
      </div>

      <style>{`
        .pay-sheet{animation:pay-sheet-up .46s cubic-bezier(.32,.72,0,1) both;transition:transform .3s cubic-bezier(.32,.72,0,1);will-change:transform}
        .pay-sheet-back{animation:pay-sheet-fade .3s ease-out both}
        .is-leaving .pay-sheet{animation:pay-sheet-down .3s cubic-bezier(.4,0,1,1) both}
        .is-leaving .pay-sheet-back{animation:pay-sheet-unfade .3s ease-in both}
        .pay-sheet-spin{animation:pay-sheet-turn .8s linear infinite}
        @keyframes pay-sheet-up{from{transform:translateY(100%)}to{transform:none}}
        @keyframes pay-sheet-down{from{transform:none}to{transform:translateY(105%)}}
        @keyframes pay-sheet-fade{from{opacity:0}to{opacity:1}}
        @keyframes pay-sheet-unfade{from{opacity:1}to{opacity:0}}
        @keyframes pay-sheet-turn{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.pay-sheet,.pay-sheet-back,.is-leaving .pay-sheet,.is-leaving .pay-sheet-back{animation-duration:.01s}}
      `}</style>
    </div>
  );
}

let host: { el: HTMLDivElement; root: Root } | null = null;

/** Whether the payment page may be shown inside the site (asked of the site's server, never more than 4 s). */
async function frameable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`/api/pay-frame?u=${encodeURIComponent(url)}`, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return false;
    const json = (await res.json()) as { frameable?: unknown };
    return json?.frameable === true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Opens the payment page: in the sheet when it can be, otherwise by going to it as before.
 * `onClose` runs when the customer closes the sheet without finishing (the order stays as it is).
 */
export async function openPayment(url: string, opts: { onClose?: () => void } = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!(await frameable(url))) {
    window.location.href = url;
    return;
  }
  if (host) {
    host.root.unmount();
    host.el.remove();
    host = null;
  }
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  host = { el, root };
  const gone = () => {
    root.unmount();
    el.remove();
    if (host?.el === el) host = null;
    opts.onClose?.();
  };
  root.render(<Sheet url={url} onGone={gone} />);
}
