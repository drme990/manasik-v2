'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { BadgeCheck, ChevronUp, Eye, Heart, LayoutGrid, MessageCircleHeart, Play, RotateCcw, Star, Volume2, VolumeX, X } from 'lucide-react';
import CountryFlag from '@/components/shared/country-flag';
import { reviewMonth } from '@/lib/review-date';
import { Link } from '@/i18n/routing';
import { useAppearance } from '@/components/providers/appearance-provider';
import { useAudioPlayer } from '@/components/providers/audio-player-provider';
import { useShareExperience } from '@/components/experience/share-experience-provider';
import { MediaKey } from '@/components/reels/media-key';
import { useDisplayCurrency, usePriceInCurrency } from '@/hooks/currency-hook';
import { REVIEWS_CATEGORY, categoriesOf, formatReelCount, posterIsProductPhoto, primaryImage, productIdsInCategory, reelKey, type ProductCategory, type Reel, type ReelReview } from '@/lib/reels';
import { justLiked, likeByCustomer, onReelStat, reelShared, reelViewed, reelStat, refreshEngagement, toggleLikeByCustomer, useEngagementOn, useEngagementSetup, useReelStat } from '@/lib/reels-engagement';
import { checkReelVideo, useReelsGone } from '@/lib/reels-gone';
import type { Product } from '@/types/Product';

/*
 * Reels: short videos, one per screen, swiped vertically — the app's viewer (manasik-app `src/app/reels.tsx`,
 * `src/components/reels/page.tsx`, `actions.tsx`) on the website. The reel on screen plays; the one before and the
 * one after are already loading, paused, so a swipe starts them at once; every reel linked to a product offers to
 * book it. Opened from the home row or the product page, never by a URL of its own.
 */

/** A first frame slower than this gets a small loading mark. */
const SLOW_MS = 600;
/** A reel that was swiped away goes back to its beginning this long after, once it is out of sight. */
const REWIND_MS = 450;
/** A neighbour starts loading at the latest this long after a reel came on screen, even if that one is still loading. */
const PRELOAD_GRACE_MS = 2500;
/** Two taps closer together than this (ms, and within `DOUBLE_TAP_REACH` px) are a double tap: a like. */
const DOUBLE_TAP_MS = 260;
const DOUBLE_TAP_REACH = 80;
/** A caption longer than this is offered a "more". */
const LONG_CAPTION = 70;
/** Seconds a reel plays before it counts as one view. */
const VIEW_AFTER_S = 3;
/** Most hearts on screen at once (a burst of taps). */
const MAX_HEARTS = 4;
/** A reel counts as "the one on screen" once this much of it is visible. */
const VIEWABILITY = 0.65;
/** A reel whose video the server no longer has says so for this long, then the pager moves on by itself. */
const GONE_PAUSE_MS = 1800;
const KEY = 46;
const GLYPH = 76;

// ── What the reels remember while the page stays open, outside React ─────────

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Sound for every reel (owner, 2026-10-16: the phone's volume key should bring the sound back — a web page is never
 * told about that key, so the closest a page can do, as TikTok's site does):
 *  - the reels begin muted only when the browser asks for it (a video may start by itself only when silent);
 *  - the customer's first touch anywhere in the viewer turns the sound on, unless he turned it off himself;
 *  - his own choice (the sound key) is remembered on this device, for every reel on every page.
 */
type SoundChoice = 'auto' | 'on' | 'off';
const SOUND_KEY = 'reels-sound';
function storedChoice(): SoundChoice {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(SOUND_KEY) : null;
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}
const reelsSoundChoice = createStore<SoundChoice>('auto');
const reelsMuted = createStore<boolean>(true);
function chooseSound(on: boolean) {
  reelsSoundChoice.set(on ? 'on' : 'off');
  reelsMuted.set(!on);
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // private window: for this visit only
  }
}
/** When the sound was last turned on by a touch: that same touch does not also pause the reel. */
let unmutedByTouchAt = 0;
/** The "swipe up" hint is shown once per visit to the site. */
const reelsHintSeen = createStore<boolean>(false);

function useStore<T>(store: { get: () => T; subscribe: (l: () => void) => () => void }): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── The viewer ──────────────────────────────────────────────────────────────

export interface ReelsViewerProps {
  reels: readonly Reel[];
  productsById: Map<string, Product>;
  /** The reel to open on; the first one when missing. */
  start?: string;
  onClose: () => void;
}

export default function ReelsViewer({ reels, productsById, start, onClose }: ReelsViewerProps) {
  const t = useTranslations('reels');
  const { appearance } = useAppearance();
  const audio = useAudioPlayer();
  // Likes and shares, only on a server that keeps them.
  useEngagementSetup(appearance.features);

  // The small voice-review player gives way to the reel's own sound (only when the viewer opens).
  const closeAudio = useRef(audio.closePlayer);
  closeAudio.current = audio.closePlayer;
  const audioBusy = audio.isOpen || audio.isPlaying;
  useEffect(() => {
    if (audioBusy) closeAudio.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const root = useRef<HTMLDivElement>(null);
  // The sound (owner, 2026-10-16): silent the first time, with «المس للصوت»; once the sound is on — by a touch or the
  // key — it stays on for every reel on every page, this visit and the next, until the customer turns it off.
  // Decided before the first reel renders (no reel is listening yet), so its player starts as it should.
  useState(() => {
    const choice = storedChoice();
    reelsSoundChoice.set(choice);
    reelsMuted.set(choice !== 'on');
    return choice;
  });
  const onTouch = useCallback(() => {
    if (!reelsMuted.get() || reelsSoundChoice.get() === 'off') return;
    // Only a touch the browser counts as the customer's (a tap, a key); a swipe it does not count is left alone, or
    // the browser would stop the reel.
    const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (activation && !activation.isActive) return;
    unmutedByTouchAt = Date.now();
    // Inside the touch itself (iPhones allow sound only there), then for every reel.
    root.current?.querySelectorAll<HTMLVideoElement>('video.reel-video').forEach((v) => {
      v.muted = false;
    });
    chooseSound(true);
  }, []);

  // The phone's back key closes the reels instead of leaving the page (owner, 2026-10-16): opening adds one step to
  // the history (same address); back takes it away and closes; the close key and Esc take it away too. Leaving for a
  // product («احجز الآن») closes without going back, so the new page is not undone.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [step] = useState(() => Date.now());
  useEffect(() => {
    // Once, even when the effect runs twice (development).
    if (window.history.state?.reelsStep !== step) window.history.pushState({ ...(window.history.state ?? {}), reelsStep: step }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [step]);
  const requestClose = useCallback(() => {
    if (window.history.state?.reelsStep === step) window.history.back();
    else closeRef.current();
  }, [step]);

  // The page behind stays still and out of reach (`inert`: no focus, no screen-reader path, until the viewer closes);
  // Esc closes; the focus comes back to where it was.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const own = root.current;
    const behind = Array.from(document.body.children).filter((el) => el !== own && !el.hasAttribute('inert') && el.tagName !== 'SCRIPT');
    behind.forEach((el) => el.setAttribute('inert', ''));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      behind.forEach((el) => el.removeAttribute('inert'));
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [requestClose]);

  // ── Categories (the app's own, merged and ordered as on its home page) ──
  const catalogue = useMemo(() => [...productsById.values()], [productsById]);
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(() => {
    const withReels = new Set(reels.map((reel) => reel.productId).filter(Boolean) as string[]);
    const products = categoriesOf(catalogue).filter((c) => [...productIdsInCategory(catalogue, c.id)].some((id) => withReels.has(id)));
    // «المراجعات» — the dashboard's own reels (the customers' videos) — is the first category (owner, 2026-10-14).
    const reviews = reels.filter((reel) => reel.source === 'dashboard').length;
    return reviews > 0 ? [{ id: REVIEWS_CATEGORY, name: t('reviews'), emoji: '', count: reviews }, ...products] : products;
  }, [catalogue, reels, t]);
  const shown = useMemo(() => {
    if (!category) return reels;
    if (category === REVIEWS_CATEGORY) return reels.filter((reel) => reel.source === 'dashboard');
    const ids = productIdsInCategory(catalogue, category);
    const picked = reels.filter((reel) => reel.productId && ids.has(reel.productId));
    return picked.length > 0 ? picked : reels;
  }, [category, reels, catalogue]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div ref={root} className="reels reels-viewer" role="dialog" aria-modal="true" aria-label={t('viewerLabel')} onPointerUpCapture={onTouch} onTouchEndCapture={onTouch} onKeyDownCapture={onTouch}>
      <div className="reels-stage">
        {/* A category chosen above starts its reels from the first (a new pager, fresh scroll). */}
        <Pager key={category ?? 'all'} reels={shown} productsById={productsById} start={category ? undefined : start} onClose={requestClose} onBook={onClose} />
        {categories.length > 1 ? <ReelCategories categories={categories} chosen={category} onChoose={setCategory} /> : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The categories along the top of the reels: "All", then each category that has reels, in the app's own order.
 * Glass chips over the video, the chosen one in Manasik green, starting after the close key on its line.
 */
const ReelCategories = memo(function ReelCategories({ categories, chosen, onChoose }: { categories: ProductCategory[]; chosen: string | null; onChoose: (id: string | null) => void }) {
  const t = useTranslations('reels');
  const chip = (id: string | null, label: string, emoji?: string) => (
    <button key={id ?? 'all'} type="button" className="reel-chip" aria-pressed={chosen === id} onClick={() => onChoose(id)}>
      {emoji ? <span aria-hidden="true">{emoji}</span> : id === REVIEWS_CATEGORY ? <MessageCircleHeart size={16} aria-hidden="true" /> : null}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="reels-categories" role="group" aria-label={t('categories')}>
      {chip(null, t('all'))}
      {categories.map((category) => chip(category.id, category.name, category.emoji))}
    </div>
  );
});

// ── The pager ───────────────────────────────────────────────────────────────

type ReelRole = 'active' | 'near' | 'far';

interface PagerProps {
  reels: readonly Reel[];
  productsById: Map<string, Product>;
  start: string | undefined;
  onClose: () => void;
  /** Leaving for a product: closes without going back in the history. */
  onBook: () => void;
}

const Pager = memo(function Pager({ reels, productsById, start, onClose, onBook }: PagerProps) {
  const t = useTranslations('reels');
  const scroller = useRef<HTMLDivElement>(null);
  const closeKey = useRef<HTMLButtonElement>(null);
  const [first] = useState(() => Math.max(0, start ? reels.findIndex((reel) => reel.id === start) : 0));
  /** The reel on screen: it plays. */
  const [active, setActive] = useState(first);
  /** The id of a reel that is on screen and showing (or has had long enough): only then may its neighbours start loading. */
  const [ready, setReady] = useState<string | null>(null);
  /** The tab is in front: the only time a reel may play. */
  const [live, setLive] = useState(() => typeof document === 'undefined' || !document.hidden);
  /** The addresses of videos the server no longer has. */
  const gone = useReelsGone();
  const count = reels.length;
  const activeId = reels[active]?.id ?? null;

  // The viewer opens on the reel that was tapped, without a scroll being seen.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = first * el.clientHeight;
    closeKey.current?.focus({ preventScroll: true });
  }, [first]);

  // Which reel is on screen: the one most of which is in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isFinite(index)) continue;
          setActive(index);
          // The customer has swiped: the hint has done its work.
          if (index !== first) reelsHintSeen.set(true);
        }
      },
      { root: el, threshold: VIEWABILITY },
    );
    el.querySelectorAll<HTMLElement>('.reel-page').forEach((page) => io.observe(page));
    return () => io.disconnect();
  }, [count, first]);

  // The screen changed size (the address bar came and went): put the reel being watched back on its page.
  const activeNow = useRef(active);
  useEffect(() => {
    activeNow.current = active;
  }, [active]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let height = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientHeight === height) return;
      height = el.clientHeight;
      el.scrollTop = activeNow.current * height;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Behind another tab: every reel stops; back in front: the one on screen goes on.
  useEffect(() => {
    const onVisible = () => setLive(!document.hidden);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // The keyboard: the arrows move one reel, like a swipe.
  const go = useCallback(
    (delta: number) => {
      const el = scroller.current;
      if (!el) return;
      const next = Math.min(count - 1, Math.max(0, active + delta));
      el.scrollTo({ top: next * el.clientHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [active, count],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // A reel that is slow to show does not hold its neighbours back for ever.
  useEffect(() => {
    if (!activeId || ready === activeId) return;
    const timer = setTimeout(() => setReady(activeId), PRELOAD_GRACE_MS);
    return () => clearTimeout(timer);
  }, [activeId, ready]);

  // The counts are asked for once the first reel is showing: its video never shares the connection with them.
  const showing = ready !== null;
  const keys = useMemo(() => reels.map((reel) => reelKey(reel.video)), [reels]);
  useEffect(() => {
    if (showing) void refreshEngagement(keys);
  }, [showing, keys]);

  const onShown = useCallback((id: string) => setReady(id), []);
  const neighbours = ready === activeId;

  // The reel on screen has turned out to be gone from the server: it says so (components/reels/reels-viewer.tsx,
  // ReelPage) and, after a moment to read that, the pager carries on to the next reel by itself. At the end of the
  // list it stays; so it does while the tab is behind another.
  const activeGone = Boolean(reels[active] && gone.has(reels[active].video));
  useEffect(() => {
    if (!activeGone || !live || active >= count - 1) return;
    const timer = setTimeout(() => go(1), GONE_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [activeGone, live, active, count, go]);

  return (
    <>
      <div ref={scroller} className="reels-pager" data-lenis-prevent>
        {reels.map((reel, index) => (
          <ReelPage
            key={reel.id}
            index={index}
            reel={reel}
            product={(reel.productId ? productsById.get(reel.productId) : null) ?? null}
            role={index === active ? 'active' : neighbours && Math.abs(index - active) === 1 ? 'near' : 'far'}
            gone={gone.has(reel.video)}
            live={live}
            onShown={onShown}
            onBook={onBook}
          />
        ))}
      </div>

      <div className="reels-top">
        <MediaKey ref={closeKey} size={44} onClick={onClose} label={t('close')}>
          <X size={20} aria-hidden="true" />
        </MediaKey>
        {count > 1 ? <SwipeHint /> : null}
      </div>
      <SoundHint />
    </>
  );
});

/** Over a reel playing silent (the browser asked for it): the way to the sound, at the top, as on TikTok's site. */
const SoundHint = memo(function SoundHint() {
  const t = useTranslations('reels');
  const muted = useStore(reelsMuted);
  const choice = useStore(reelsSoundChoice);
  if (!muted || choice === 'off') return null;
  return (
    <button type="button" className="reels-sound-hint" onClick={() => chooseSound(true)}>
      <VolumeX size={16} aria-hidden="true" />
      <span>{t('tapForSound')}</span>
    </button>
  );
});

/** Shown on the first reel of a visit, until the customer swipes: not everyone has used an app like this. */
const SwipeHint = memo(function SwipeHint() {
  const t = useTranslations('reels');
  const seen = useStore(reelsHintSeen);
  /** A moment has passed since the viewer opened: the hint may show. */
  const [delayed, setDelayed] = useState(false);
  /** Faded out after the first swipe: nothing is drawn any more. */
  const [gone, setGone] = useState(seen);
  useEffect(() => {
    if (gone) return;
    const timer = setTimeout(() => (seen ? setGone(true) : setDelayed(true)), seen ? 400 : 900);
    return () => clearTimeout(timer);
  }, [seen, gone]);
  if (gone) return null;
  return (
    <div className="reels-hint" data-shown={delayed && !seen} aria-hidden="true">
      <span className="reels-hint-arrow">
        <ChevronUp size={16} />
      </span>
      <span>{t('swipe')}</span>
    </div>
  );
});

// ── One page of the pager ───────────────────────────────────────────────────

type Status = 'loading' | 'ready' | 'error';

interface ReelPageProps {
  index: number;
  reel: Reel;
  product: Product | null;
  /** On screen, next to it (it holds a paused player and buffers), or further away (a poster only). */
  role: ReelRole;
  /** The server no longer has this reel's video: no player is made for it. */
  gone: boolean;
  live: boolean;
  /** The reel is on screen and its picture is showing. */
  onShown: (id: string) => void;
  onBook: () => void;
}

/** One reel, as tall as the screen. Memoised: when the customer moves to another reel only the pages whose part changes are rendered again. */
const ReelPage = memo(function ReelPage({ index, reel, product, role, gone, live, onShown, onBook }: ReelPageProps) {
  const t = useTranslations('reels');
  const active = role === 'active';
  // A player from the moment the pager counts this reel among the playing one's neighbours until it is far away again.
  const holds = role !== 'far' && !gone;
  const key = useMemo(() => reelKey(reel.video), [reel.video]);
  const muted = useStore(reelsMuted);
  const on = useEngagementOn();

  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /** The player failed while the reel was waiting off screen; it gets a fresh one when it comes on screen. */
  const [stale, setStale] = useState(false);
  const [hearts, setHearts] = useState<readonly { id: number; x: number; y: number; tilt: number }[]>([]);

  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const retried = useRef(false);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const single = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartId = useRef(0);

  const ambient = posterIsProductPhoto(reel, product);
  // Around a clip until its first frame: its poster, softened. A reel without a poster borrows its product's photo,
  // so it never opens on bare black.
  const soft = reel.poster ?? (product ? primaryImage(product) : null);
  // A review reel's words are the customer's transcript (the reviewer himself is drawn in the foot); otherwise the caption.
  const caption = reel.review ? reel.review.transcript ?? '' : reel.caption && reel.caption !== reel.productName ? reel.caption : '';
  const broken = failed || gone;

  const restart = useCallback(() => {
    setFailed(false);
    setShown(false);
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  // Far away again: the player is gone, the poster is back. (State follows the part this reel plays, adjusted as it
  // changes — the way React asks for derived state — so no render is wasted on an effect.)
  const [heldBefore, setHeldBefore] = useState(holds);
  if (heldBefore !== holds) {
    setHeldBefore(holds);
    if (!holds) {
      setStale(false);
      setShown(false);
      setFailed(false);
      setStatus('loading');
    }
  }
  // Coming on screen: a player that failed while waiting is replaced. Leaving it: paused and opened captions let go.
  const [activeBefore, setActiveBefore] = useState(active);
  if (activeBefore !== active) {
    setActiveBefore(active);
    if (active && stale) {
      setStale(false);
      restart();
    }
    if (!active) {
      setPaused(false);
      setExpanded(false);
    }
  }
  useEffect(() => {
    if (!holds) track.current?.style.setProperty('--p', '0');
  }, [holds]);

  useEffect(() => {
    if (active) return;
    retried.current = false;
    if (single.current) clearTimeout(single.current);
    single.current = null;
    // Swiped away: it freezes on its last picture while it slides out, then goes back to the beginning (out of sight).
    const timer = setTimeout(() => {
      const el = video.current;
      if (el) {
        try {
          el.currentTime = 0;
        } catch {
          // Nothing loaded yet.
        }
      }
      track.current?.style.setProperty('--p', '0');
    }, REWIND_MS);
    return () => clearTimeout(timer);
  }, [active]);

  // Plays or pauses to match what is wanted right now. A browser refuses sound without a gesture: then silently.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && !paused && live) {
      const played = el.play();
      if (played) {
        played.catch(() => {
          if (!reelsMuted.get() || !el.muted) {
            reelsMuted.set(true);
            el.muted = true;
            el.play().catch(() => undefined);
          }
        });
      }
    } else {
      el.pause();
    }
  }, [active, paused, live, attempt, holds]);

  useEffect(() => {
    const el = video.current;
    if (el) el.muted = muted;
  }, [muted, attempt, holds]);

  useEffect(() => {
    if (active && shown) onShown(reel.id);
  }, [active, shown, reel.id, onShown]);

  // A small loading mark, only when the picture is really late: each wait has a name, and the mark shows once the
  // timer of that very wait has run out.
  const stall = active && !failed && (!shown || status === 'loading') ? `${attempt}-${shown}-${status}` : null;
  const [slowFor, setSlowFor] = useState<string | null>(null);
  useEffect(() => {
    if (!stall) return;
    const timer = setTimeout(() => setSlowFor(stall), SLOW_MS);
    return () => clearTimeout(timer);
  }, [stall]);
  const slow = stall !== null && slowFor === stall;

  useEffect(
    () => () => {
      if (single.current) clearTimeout(single.current);
    },
    [],
  );

  const onFirstFrame = useCallback(() => {
    setShown(true);
    // A picture on screen means the player has what it needs, whatever was last heard from it.
    setStatus('ready');
  }, []);

  const onError = useCallback(() => {
    // Is the file still on the server? If it is not, the pager says so and moves on (see `useReelsGone`).
    void checkReelVideo(reel.video);
    if (!active) {
      setStale(true);
    } else if (!retried.current) {
      // Once, quietly; a second failure is shown to the customer.
      retried.current = true;
      restart();
    } else {
      setFailed(true);
    }
  }, [active, restart, reel.video]);

  const onTime = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    const length = el.duration;
    const p = Number.isFinite(length) && length > 0 ? Math.min(1, Math.max(0, el.currentTime / length)) : 0;
    track.current?.style.setProperty('--p', p.toFixed(3));
    // A view: the reel played VIEW_AFTER_S seconds (or half of a shorter clip) while on screen (owner, 2026-10-16).
    const enough = Number.isFinite(length) && length > 0 ? Math.min(VIEW_AFTER_S, length / 2) : VIEW_AFTER_S;
    if (active && el.currentTime >= enough) void reelViewed(key);
  }, [active, key]);

  // Anywhere on the picture: pause, or play again.
  const onTap = useCallback(() => {
    if (broken) return;
    // The touch that just brought the sound back is not also a pause.
    if (Date.now() - unmutedByTouchAt < 600) return;
    setPaused((value) => !value);
  }, [broken]);

  // A tap pauses or plays; with likes on, a second tap close behind it is a double tap: a like, and a big heart where
  // the finger was. Then a single tap waits that moment before it pauses (as on every feed); without likes it does not wait.
  const onSurface = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!on || broken) {
        onTap();
        return;
      }
      // Where the finger was on the reel (page coordinates of the reel; physical left/top, the same in both directions).
      const rect = page.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : 0;
      const y = rect ? e.clientY - rect.top : 0;
      const at = Date.now();
      const before = lastTap.current;
      lastTap.current = { at, x, y };
      if (before && at - before.at < DOUBLE_TAP_MS && Math.hypot(x - before.x, y - before.y) < DOUBLE_TAP_REACH) {
        if (single.current) clearTimeout(single.current);
        single.current = null;
        heartId.current += 1;
        // A lean of up to 14° either way, alternating, so a run of taps fans out.
        const tilt = (heartId.current % 2 === 0 ? 1 : -1) * (6 + ((heartId.current * 5) % 9));
        setHearts((list) => [...list.slice(-(MAX_HEARTS - 1)), { id: heartId.current, x, y, tilt }]);
        likeByCustomer(key, true);
        return;
      }
      if (single.current) clearTimeout(single.current);
      single.current = setTimeout(() => {
        single.current = null;
        onTap();
      }, DOUBLE_TAP_MS);
    },
    [on, broken, onTap, key],
  );

  const onRetry = useCallback(() => {
    retried.current = false;
    restart();
  }, [restart]);
  const heartGone = useCallback((id: number) => setHearts((list) => list.filter((heart) => heart.id !== id)), []);

  return (
    <div ref={page} className="reel-page" data-index={index} data-active={active}>
      {/* Under the video: a soft version of the poster, seen until the clip's first frame. */}
      {soft ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a blurred backdrop at the video's own storage size */}
          <img src={soft} alt="" className="reel-fill reel-soft" loading={holds ? 'eager' : 'lazy'} decoding="async" draggable={false} aria-hidden="true" />
          <div className="reel-fill reel-dim" aria-hidden="true" />
        </>
      ) : null}

      {holds ? (
        <video
          key={attempt}
          ref={video}
          className="reel-video"
          src={reel.video}
          preload={active ? 'auto' : 'metadata'}
          playsInline
          loop
          muted={muted}
          disablePictureInPicture
          disableRemotePlayback
          onLoadedData={onFirstFrame}
          onPlaying={onFirstFrame}
          onCanPlay={() => setStatus('ready')}
          onWaiting={() => setStatus('loading')}
          onError={onError}
          onTimeUpdate={onTime}
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      {/* Over the video until its first frame is drawn, then it fades away: a real poster has the clip's shape. */}
      {reel.poster && !ambient ? (
        // eslint-disable-next-line @next/next/no-img-element -- the poster at the storage's own size, over the whole page
        <img src={reel.poster} alt="" className="reel-fill reel-cover" style={{ opacity: shown ? 0 : 1 }} loading={holds ? 'eager' : 'lazy'} decoding="async" draggable={false} aria-hidden="true" />
      ) : null}

      <div className="reel-scrim-top" aria-hidden="true" />
      <div className="reel-scrim-bottom" aria-hidden="true" />
      {/* A caption opened to be read: the picture steps back behind all of it. */}
      {expanded ? <div className="reel-fill reel-dim" aria-hidden="true" /> : null}

      {/* The whole picture is the surface that pauses (and, with likes on, likes on a double tap). */}
      <button type="button" className="reel-surface" onClick={onSurface} aria-label={t(paused ? 'play' : 'pause')} tabIndex={active ? 0 : -1} />

      <div className="reel-middle">
        {slow && !paused ? <span className="reel-spinner" role="status" aria-label={t('loading')} /> : null}
        {/* Paused: the glossy play button settles in the middle and stays. */}
        <span className="reel-glyph gradient-site gradient-text" data-on={paused} aria-hidden="true" style={{ position: 'absolute', width: GLYPH, height: GLYPH }}>
          <Play size={36} fill="currentColor" />
        </span>
      </div>

      {hearts.length > 0 ? (
        <div className="reel-fill" style={{ pointerEvents: 'none' }} aria-hidden="true">
          {hearts.map((heart) => (
            <span key={heart.id} className="reel-heart" style={{ left: heart.x, top: heart.y, ['--tilt' as string]: `${heart.tilt}deg` }} onAnimationEnd={() => heartGone(heart.id)}>
              <Heart size={104} color="var(--error)" fill="var(--error)" />
            </span>
          ))}
        </div>
      ) : null}

      {broken ? (
        <div className="reel-failed" role="alert">
          <p>{t(gone ? 'gone' : 'failed')}</p>
          {/* A video the server no longer has cannot be tried again, and it is not the connection: it says so, the pager
              moves on by itself after a moment, and the card below still books. */}
          {gone ? null : (
            <MediaKey onClick={onRetry} label={t('retry')} style={{ height: 44 }}>
              <RotateCcw size={16} aria-hidden="true" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t('retry')}</span>
            </MediaKey>
          )}
        </div>
      ) : null}

      <div className="reel-bottom">
        <ReelActions reelKey={key} slug={reel.productSlug} name={reel.productName} active={active} />

        {/* The redesigned foot (owner, 2026-10-16: the old card covered the speaker): no card, straight on the dark
            gradient — the customer and «شارك تجربتك», his words, then one line with the product and «احجز الآن». */}
        {reel.review ? (
          <div className="reel-who">
            <Reviewer review={reel.review} />
            <ShareFromReel active={active} onBefore={onBook} alone={false} />
          </div>
        ) : reel.productSlug && reel.productName ? (
          <div className="reel-who reel-who-end">
            <ShareFromReel active={active} onBefore={onBook} alone={false} />
          </div>
        ) : null}

        {caption ? (
          <button type="button" className="reel-caption" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} tabIndex={active ? 0 : -1}>
            <span className="reel-caption-text">{caption}</span>
            {caption.length > LONG_CAPTION ? <span className="reel-caption-more">{t(expanded ? 'less' : 'more')}</span> : null}
          </button>
        ) : null}

        {/* The foot, in the site's own card: the product line, then «احجز الآن» and «شارك تجربتك» side by side
            (owner, 2026-10-14); a reel with no product carries the share key alone. */}
        <ReelFoot product={product} reel={reel} active={active} onBook={onBook} />

        <div ref={track} className="reel-track" aria-hidden="true">
          <div className="reel-track-fill" />
        </div>
      </div>
    </div>
  );
});

// ── The foot of a reel: the product and the two keys ───────────────────────

const ShareFromReel = memo(function ShareFromReel({ active, onBefore, alone }: { active: boolean; onBefore: () => void; alone: boolean }) {
  const t = useTranslations('shareExperience');
  const { enabled, open } = useShareExperience();
  if (!enabled) return null;
  return (
    <button
      type="button"
      tabIndex={active ? 0 : -1}
      onClick={() => {
        // The page behind is inert while the viewer is up: it closes first, then the window opens on the page.
        onBefore();
        setTimeout(open, 0);
      }}
      className={alone ? 'reel-key-wide gradient-site gradient-text' : 'reel-share-pill'}
    >
      <MessageCircleHeart size={alone ? 18 : 16} aria-hidden="true" />
      <span>{t('button')}</span>
    </button>
  );
});

/** The customer behind a review reel, with the very elements of his card on the reviews page (owner, 2026-10-14). */
const Reviewer = memo(function Reviewer({ review }: { review: ReelReview }) {
  const locale = useLocale();
  const tr = useTranslations('shareExperience');
  const rounded = Math.round(review.rating ?? 0);
  const month = reviewMonth(review.date, locale);
  return (
    <div className="reel-reviewer">
      {review.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- customer photo from storage
        <img src={review.avatarUrl} alt="" width={40} height={40} loading="lazy" className="reel-reviewer-photo" />
      ) : (
        <span className="reel-reviewer-photo reel-reviewer-initial" aria-hidden="true">
          {review.name.trim().charAt(0)}
        </span>
      )}
      <span className="reel-reviewer-text">
        <span className="reel-reviewer-name">
          <span className="reel-reviewer-name-text">{review.name}</span>
          {review.country ? <CountryFlag code={review.country} /> : null}
          {review.rating !== undefined ? <BadgeCheck size={18} aria-label={tr('verifiedPurchase')} className="reel-reviewer-badge" /> : null}
        </span>
        {review.rating || month ? (
          <span className="reel-reviewer-meta">
            {review.rating ? (
              <span className="reel-reviewer-stars" aria-label={`${review.rating}/5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} aria-hidden="true" className={i < rounded ? 'fill-yellow-500 text-yellow-500' : 'text-stroke/40'} />
                ))}
              </span>
            ) : null}
            {month ? <span className="reel-reviewer-month">{month}</span> : null}
          </span>
        ) : null}
      </span>
    </div>
  );
});

const ReelFoot = memo(function ReelFoot({ product, reel, active, onBook }: { product: Product | null; reel: Reel; active: boolean; onBook: () => void }) {
  const t = useTranslations('reels');
  const tc = useTranslations('common.buttons');
  const getPrice = usePriceInCurrency();
  const displayCurrency = useDisplayCurrency();
  const withProduct = Boolean(reel.productSlug && reel.productName);
  const image = product ? primaryImage(product) : null;
  // The price is the catalogue's own, in the customer's currency; without one, nothing is shown.
  const price = useMemo(() => {
    if (!product) return null;
    const sizes = (product.sizes ?? []).filter((size) => size.isAvailable !== false);
    const offered = sizes.length > 0 ? sizes : (product.sizes ?? []);
    const amounts = offered.map((size) => getPrice(size.resolvedPrices)).filter((p): p is { amount: number; currency: string } => Boolean(p));
    if (amounts.length === 0) return null;
    const cheapest = amounts.reduce((best, p) => (p.amount < best.amount ? p : best));
    return { ...cheapest, startsFrom: offered.length > 1 };
  }, [product, getPrice]);
  const href = `/products/${reel.productSlug}`;
  // A customer's reel: «احجز الآن» offers his product(s) and every product (owner, 2026-10-16).
  const choices = reel.review
    ? [...(withProduct ? [{ slug: reel.productSlug as string, name: reel.productName as string }] : []), ...(reel.moreProducts ?? [])]
    : [];
  const chooser = Boolean(reel.review);
  const [choosing, setChoosing] = useState(false);
  // Swiped away: the list closes. (Adjusted while rendering, as React asks for derived state.)
  const [activeBefore, setActiveBefore] = useState(active);
  if (activeBefore !== active) {
    setActiveBefore(active);
    if (!active) setChoosing(false);
  }

  return (
    <div className="reel-foot" data-with-product={withProduct}>
      {choosing ? (
        <div className="reel-choose" role="list" aria-label={t('chooseProduct')}>
          {choices.map((item) => (
            <Link key={item.slug} role="listitem" href={`/products/${item.slug}`} className="reel-choose-item" onClick={onBook} tabIndex={active ? 0 : -1}>
              {item.name}
            </Link>
          ))}
          <Link role="listitem" href="/products" className="reel-choose-item reel-choose-all" onClick={onBook} tabIndex={active ? 0 : -1}>
            <LayoutGrid size={16} aria-hidden="true" />
            {t('browseAll')}
          </Link>
        </div>
      ) : null}
      <div className="reel-buy">
        {withProduct ? (
          <Link href={href} className="reel-product" onClick={onBook} tabIndex={active ? 0 : -1} aria-label={reel.productName ?? undefined}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- the product's own picture, small
              <img src={image} alt="" className="reel-product-image" loading="lazy" decoding="async" draggable={false} />
            ) : null}
            <span className="reel-product-text">
              <span className="reel-product-name">{reel.productName}</span>
              {price ? (
                <span className="reel-product-price">
                  {price.startsFrom ? <span className="reel-product-from">{tc('startsFrom')} </span> : null}
                  {price.amount.toLocaleString('en-US')} {displayCurrency || price.currency}
                </span>
              ) : null}
            </span>
          </Link>
        ) : null}
        {chooser ? (
          <button type="button" className="reel-book gradient-site gradient-text" aria-expanded={choosing} onClick={() => setChoosing((v) => !v)} tabIndex={active ? 0 : -1}>
            {t('book')}
          </button>
        ) : withProduct ? (
          <Link href={href} className="reel-book gradient-site gradient-text" onClick={onBook} tabIndex={active ? 0 : -1}>
            {t('book')}
          </Link>
        ) : (
          // A reel with no product (a banner's video, say): booking first and big, «شارك تجربتك» small beside it
          // (owner, 2026-10-16: «زر يحجز … دي أهم من شارك تجربتك»).
          <>
            <Link href="/products" className="reel-key-wide gradient-site gradient-text" onClick={onBook} tabIndex={active ? 0 : -1}>
              <LayoutGrid size={18} aria-hidden="true" />
              <span>{t('book')}</span>
            </Link>
            <ShareFromReel active={active} onBefore={onBook} alone={false} />
          </>
        )}
      </div>
    </div>
  );
});

// ── The side rail: like, share, sound ───────────────────────────────────────

/**
 * TikTok's order from the top: like, share, sound — glossy 3D pictures on the round dark-glass keys. Which side: the END
 * of the reading direction — the right in English, the LEFT in Arabic — so it never runs into the caption and the
 * product card, which start from the reading side.
 */
const ReelActions = memo(function ReelActions({ reelKey: key, slug, name, active }: { reelKey: string; slug: string | null; name: string | null; active: boolean }) {
  const on = useEngagementOn();
  return (
    <div className="reel-rail">
      {on ? <ViewsFigure reelKey={key} /> : null}
      {on ? <LikeKey reelKey={key} active={active} /> : null}
      {slug ? <ShareKey reelKey={key} slug={slug} name={name} counted={on} active={active} /> : null}
      <SoundKey active={active} />
    </div>
  );
});

/** The reel's real views, above the heart, its number bigger than the others: the one the eye goes to (owner, 2026-10-16). */
const ViewsFigure = memo(function ViewsFigure({ reelKey: key }: { reelKey: string }) {
  const t = useTranslations('reels');
  const locale = useLocale();
  const stat = useReelStat(key);
  const figure = stat.showCounts.views ? formatReelCount(stat.views, locale) : null;
  // The same round glass key as the like and the share (owner, 2026-10-16: it must look like them), but nothing
  // to press: a picture with its number. The number shows once it reaches the dashboard's threshold.
  return (
    <div className="reel-rail-item" role="img" aria-label={figure ? t('views', { count: figure }) : t('viewsLabel')}>
      <span className="reel-key reel-key-static" style={{ width: KEY, height: KEY }} aria-hidden="true">
        <span className="reel-key-face">
          <Eye size={24} strokeWidth={2.2} />
        </span>
      </span>
      {figure ? <span className="reel-count">{figure}</span> : null}
    </div>
  );
});

const SPARKS = 6;
const SPARK_REACH = 30;

const LikeKey = memo(function LikeKey({ reelKey: key, active }: { reelKey: string; active: boolean }) {
  const t = useTranslations('reels');
  const locale = useLocale();
  const stat = useReelStat(key);
  const liked = stat.liked;
  const [pop, setPop] = useState<'on' | 'off' | null>(null);
  const [burst, setBurst] = useState(0);

  // The heart answers the customer's own like (a tap here or a double tap on the video), never a number arriving:
  // it listens to its own reel in the store, and pops only when the like it shows has changed.
  useEffect(() => {
    let was = reelStat(key).liked;
    return onReelStat(key, () => {
      const next = reelStat(key).liked;
      if (next === was) return;
      was = next;
      if (next && !justLiked(key)) return;
      setPop(next ? 'on' : 'off');
      if (next) setBurst((n) => n + 1);
    });
  }, [key]);

  const figure = stat.showCounts.likes ? formatReelCount(stat.likes, locale) : null;
  return (
    <div className="reel-rail-item">
      <MediaKey size={KEY} label={figure ? t('likes', { count: figure }) : t('like')} selected={liked} onClick={() => toggleLikeByCustomer(key)} tabIndex={active ? 0 : -1}>
        <span className="reel-like-pop" data-pop={pop ?? undefined} onAnimationEnd={() => setPop(null)}>
          {/* Not liked: a plain white heart, as every feed draws it; liked: the glossy red one. */}
          <Heart size={24} aria-hidden="true" color={liked ? 'var(--error)' : 'currentColor'} fill={liked ? 'var(--error)' : 'none'} strokeWidth={2.2} />
        </span>
      </MediaKey>
      {burst > 0 ? <Sparks key={burst} onDone={() => setBurst(0)} /> : null}
      {figure ? <span className="reel-count">{figure}</span> : null}
    </div>
  );
});

/** Six sparks fly out from the heart and fade; they exist only while they fly. */
const Sparks = memo(function Sparks({ onDone }: { onDone: () => void }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => {
        // Physical angles: a burst is round, the same in both directions.
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / SPARKS;
        return { sx: `${(Math.cos(angle) * SPARK_REACH).toFixed(1)}px`, sy: `${(Math.sin(angle) * SPARK_REACH).toFixed(1)}px`, color: i % 2 === 0 ? '#fff' : '#ffd27a' };
      }),
    [],
  );
  return (
    <span className="reel-sparks" aria-hidden="true">
      {sparks.map((spark, i) => (
        <span key={i} className="reel-spark" style={{ ['--sx' as string]: spark.sx, ['--sy' as string]: spark.sy, backgroundColor: spark.color }} onAnimationEnd={i === 0 ? onDone : undefined} />
      ))}
    </span>
  );
});

const ShareKey = memo(function ShareKey({ reelKey: key, slug, name, counted, active }: { reelKey: string; slug: string; name: string | null; counted: boolean; active: boolean }) {
  const t = useTranslations('reels');
  const locale = useLocale();
  const stat = useReelStat(key);
  const [copied, setCopied] = useState(false);
  const share = useCallback(async () => {
    const url = `${window.location.origin}/${locale}/products/${slug}`;
    const title = name ?? '';
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
      // The sheet answers only once something was shared (and refuses when it was dismissed).
      void reelShared(key);
    } catch {
      // Dismissed, or no way to share here: nothing to count.
    }
  }, [locale, slug, name, key]);
  const figure = counted && stat.showCounts.shares ? formatReelCount(stat.shares, locale) : null;
  return (
    <div className="reel-rail-item">
      <MediaKey size={KEY} label={figure ? t('shares', { count: figure }) : t('share')} onClick={() => void share()} tabIndex={active ? 0 : -1}>
        {/* the share arrow everyone knows (owner, 2026-10-16) */}
        <ShareArrow size={24} />
      </MediaKey>
      {copied ? (
        <span className="reel-count" role="status">
          {t('copied')}
        </span>
      ) : figure ? (
        <span className="reel-count">{figure}</span>
      ) : null}
    </div>
  );
});

const SoundKey = memo(function SoundKey({ active }: { active: boolean }) {
  const t = useTranslations('reels');
  const muted = useStore(reelsMuted);
  const choice = useStore(reelsSoundChoice);
  return (
    <MediaKey
      size={KEY}
      // Silent and not by the customer's choice: the key pulses, to be noticed (owner, 2026-10-16).
      className={muted && choice !== 'off' ? 'reel-key-call' : undefined}
      label={t(muted ? 'unmute' : 'mute')}
      onClick={() => {
        // This very tap also reached the viewer's touch (which turns sound on): the key decides from what it showed.
        chooseSound(muted);
      }}
      tabIndex={active ? 0 : -1}
    >
      {muted ? <VolumeX size={22} aria-hidden="true" strokeWidth={2.2} /> : <Volume2 size={22} aria-hidden="true" strokeWidth={2.2} />}
    </MediaKey>
  );
});

/** The best-known share picture: the curved arrow, filled (owner, 2026-10-16). */
function ShareArrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M13.2 3.6c0-.9 1.1-1.4 1.8-.8l7.3 6.5c.5.4.5 1.2 0 1.6L15 17.4c-.7.6-1.8.1-1.8-.8v-3.2c-4.6.2-7.6 1.6-9.8 5-.3.4-.9.2-.8-.3.5-5.8 3.8-9.5 10.6-10.1V3.6Z" />
    </svg>
  );
}
