'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { BadgeCheck, FileText, Mic, Pause, PenLine, Play, Star, Video } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useAudioPlayer } from '@/components/providers/audio-player-provider';
import CountryFlag from '@/components/shared/country-flag';
import type { SharedMedia } from '@/lib/seo-content';
import { reviewMonth } from '@/lib/review-date';
import type { Reel } from '@/lib/reels';

const ReelsViewer = dynamic(() => import('@/components/reels/reels-viewer'), { ssr: false });

/**
 * The reviews page's three kinds (owner, 2026-10-13): written, voice and video.
 * Every approved experience is here, so a customer who shared one always finds
 * it; the homepage, product pages and reels show only the featured ones.
 * All three panels are in the page (the hidden ones too), so nothing is lost
 * for search engines; the tabs only choose which one is on screen.
 */
type Kind = 'text' | 'audio' | 'video';

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} aria-hidden="true" className={i < rounded ? 'fill-yellow-500 text-yellow-500' : 'text-stroke/40'} />
      ))}
    </span>
  );
}

function Person({ item, purchaseLabel }: { item: SharedMedia; purchaseLabel: string }) {
  const locale = useLocale();
  // Every voice and video card carries the tick and «شراء موثّق» (owner, 2026-10-17).
  const verified = true;
  return (
    <header className="flex items-center gap-3">
      {item.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- customer photo from storage
        <img src={item.avatarUrl} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-sm font-bold text-success" aria-hidden="true">
          {item.name.trim().charAt(0)}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
          <span className="truncate">{item.name}</span>
          {item.country ? <CountryFlag code={item.country} /> : null}
          {verified ? <BadgeCheck size={18} aria-label={purchaseLabel} className="shrink-0 fill-success text-white" /> : null}
        </span>
        {item.rating || item.date ? (
          <span className="flex items-center gap-2">
            {item.rating ? <Stars rating={item.rating} /> : null}
            {reviewMonth(item.date, locale) ? <span className="text-xs text-secondary">{reviewMonth(item.date, locale)}</span> : null}
          </span>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The customer's words, written out (owner, 2026-10-13): shown only after the owner approved
 * the transcript in the dashboard. Closed by default, but the text is in the page for search engines.
 */
function Transcript({ text, className = '' }: { text?: string; className?: string }) {
  const isAr = useLocale() !== 'en';
  if (!text) return null;
  return (
    <details className={`group text-sm ${className}`}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-success [&::-webkit-details-marker]:hidden">
        <FileText size={15} aria-hidden />
        {isAr ? 'اقرأ النص' : 'Read the transcript'}
      </summary>
      <p className="mt-1 whitespace-pre-line leading-7 text-secondary">{text}</p>
    </details>
  );
}

/** «✓ شراء موثّق», at the foot of a voice or video card (owner, 2026-10-17). */
function Verified({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
      <BadgeCheck size={14} aria-hidden />
      {label}
    </span>
  );
}

/**
 * The customer's words on top of his voice card (owner, 2026-10-17): the first lines in view, «اقرأ النص» opens the
 * rest in the card itself. The whole text is in the page either way (search engines read it).
 */
function VoiceWords({ text }: { text?: string }) {
  const isAr = useLocale() !== 'en';
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="rounded-xl bg-foreground/[0.04] px-3 py-2.5">
      <p className={`whitespace-pre-line text-sm leading-7 text-secondary ${open ? '' : 'line-clamp-3'}`}>{text}</p>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-success">
        <FileText size={15} aria-hidden />
        {open ? (isAr ? 'إخفاء النص' : 'Hide the transcript') : isAr ? 'اقرأ النص' : 'Read the transcript'}
      </button>
    </div>
  );
}

/** m:ss */
const clock = (t: number) => (Number.isFinite(t) && t > 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

/**
 * The voice tab's own player (owner, 2026-10-13): every card IS the player — the site's player bar (photo, name,
 * time, play) in place of the browser's — and when one ends the next one plays, down the list. One sound at a time:
 * the site's bottom player is closed when one starts here.
 */
function VoiceList({ items, purchaseLabel, shown }: { items: SharedMedia[]; purchaseLabel: string; shown: boolean }) {
  const isAr = useLocale() !== 'en';
  const site = useAudioPlayer();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ now: 0, total: 0 });

  const play = (index: number) => {
    const el = audio.current;
    const item = items[index];
    if (!el || !item) return;
    if (site.isOpen) site.closePlayer();
    if (index !== current) {
      el.src = item.url;
      setTime({ now: 0, total: 0 });
      setCurrent(index);
    }
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const toggle = (index: number) => {
    const el = audio.current;
    if (index === current && el && !el.paused) {
      el.pause();
      setPlaying(false);
    } else play(index);
  };
  // Another tab chosen: the voice stops (it never plays on behind the videos).
  useEffect(() => {
    if (!shown && audio.current && !audio.current.paused) audio.current.pause();
  }, [shown]);
  // The site's bottom player started: this one stops.
  useEffect(() => {
    if (site.isOpen && site.isPlaying && audio.current && !audio.current.paused) {
      // The audio's own «pause» event sets the key back to play.
      audio.current.pause();
    }
  }, [site.isOpen, site.isPlaying]);

  return (
    <>
      <audio
        ref={audio}
        preload="none"
        className="hidden"
        onTimeUpdate={(e) => setTime({ now: e.currentTarget.currentTime, total: e.currentTarget.duration })}
        onLoadedMetadata={(e) => setTime({ now: e.currentTarget.currentTime, total: e.currentTarget.duration })}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        // When one ends, the next one plays (the last one simply stops).
        onEnded={() => (current + 1 < items.length ? play(current + 1) : setPlaying(false))}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const on = index === current;
          const isPlaying = on && playing;
          const share = on && time.total > 0 ? Math.min(100, (time.now / time.total) * 100) : 0;
          return (
            // One card per voice (owner, 2026-10-17): who and when on top, then his words with «اقرأ النص», then the
            // player, and «شراء موثّق» at the foot — the same marks as the written and video cards.
            <figure
              key={item.id}
              data-voice={item.id}
              className={`flex flex-col gap-3 rounded-2xl border bg-card-bg p-4 shadow-md transition-colors ${on ? 'border-success/60' : 'border-stroke'}`}
            >
              <Person item={item} purchaseLabel={purchaseLabel} />
              <VoiceWords text={item.transcript} />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-label={isPlaying ? (isAr ? 'إيقاف' : 'Pause') : isAr ? `استمع إلى ${item.name}` : `Listen to ${item.name}`}
                  aria-pressed={isPlaying}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white shadow-lg transition active:scale-95"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" aria-hidden /> : <Play size={20} fill="currentColor" className="ms-0.5" aria-hidden />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* How far it has played: drag or tap to jump (a real slider, 44px to touch). */}
                  <input
                    type="range"
                    min={0}
                    max={on && time.total > 0 ? time.total : 1}
                    step={0.1}
                    value={on ? time.now : 0}
                    disabled={!on || !(time.total > 0)}
                    onChange={(e) => {
                      const el = audio.current;
                      if (el && on) el.currentTime = Number(e.target.value);
                    }}
                    aria-label={isAr ? `موضع التشغيل: ${item.name}` : `Position: ${item.name}`}
                    aria-valuetext={`${clock(on ? time.now : 0)} / ${clock(on ? time.total : 0)}`}
                    dir="ltr"
                    className="voice-seek h-8 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default"
                    style={{ ['--p' as string]: `${share}%` }}
                  />
                  <span className="-mt-1 text-xs tabular-nums text-secondary" dir="ltr">
                    {on ? `${clock(time.now)} / ${clock(time.total)}` : clock(0)}
                  </span>
                </div>
              </div>
              <Verified label={purchaseLabel} />
            </figure>
          );
        })}
      </div>
    </>
  );
}

/**
 * The video reviews as a grid of short cards (owner, 2026-10-17: «تحت بعض كده مش منظم»): the clip's still, the
 * customer, his month and «شراء موثّق»; a touch opens the site's reels player on that clip, and the swipe goes on to
 * the next ones. Each card keeps «اقرأ النص» with the words in the page, which is what search engines read.
 */
function VideoGrid({ items, purchaseLabel }: { items: SharedMedia[]; purchaseLabel: string }) {
  const locale = useLocale();
  const isAr = locale !== 'en';
  const [open, setOpen] = useState<string | null>(null);
  const reels = useMemo<Reel[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        video: item.url,
        poster: item.poster ?? null,
        caption: '',
        productId: null,
        productSlug: null,
        productName: null,
        source: 'dashboard',
        lead: false,
        review: { name: item.name, avatarUrl: item.avatarUrl, rating: item.rating, country: item.country, date: item.date, transcript: item.transcript },
      })),
    [items],
  );
  const none = useMemo(() => new Map(), []);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <figure key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-stroke bg-card-bg shadow-md">
            <button type="button" onClick={() => setOpen(item.id)} aria-label={isAr ? `شاهد تجربة ${item.name}` : `Watch ${item.name}'s experience`} className="group relative block aspect-[9/16] w-full overflow-hidden bg-black">
              {item.poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- the server's still of the video
                <img src={item.poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-active:scale-95" />
              ) : (
                <video src={`${item.url}#t=0.5`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-lg">
                  <Play size={20} fill="currentColor" className="ms-0.5" />
                </span>
              </span>
            </button>
            <figcaption className="flex flex-1 flex-col gap-2 p-3">
              <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-foreground">
                <span className="truncate">{item.name}</span>
                {item.country ? <CountryFlag code={item.country} /> : null}
                <BadgeCheck size={16} aria-label={purchaseLabel} className="shrink-0 fill-success text-white" />
              </span>
              {item.rating || reviewMonth(item.date, locale) ? (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {item.rating ? <Stars rating={item.rating} /> : null}
                  {reviewMonth(item.date, locale) ? <span className="text-xs text-secondary">{reviewMonth(item.date, locale)}</span> : null}
                </span>
              ) : null}
              <Verified label={purchaseLabel} />
              <Transcript text={item.transcript} />
            </figcaption>
          </figure>
        ))}
      </div>
      {open ? <ReelsViewer reels={reels} productsById={none} start={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export default function ReviewsTabs({
  written,
  audio,
  video,
  labels,
}: {
  /** The written reviews, already rendered (the existing cards). */
  written: React.ReactNode;
  audio: SharedMedia[];
  video: SharedMedia[];
  labels: { text: string; audio: string; video: string; purchase: string; counts: Record<Kind, number> };
}) {
  const kinds = (['text', 'audio', 'video'] as Kind[]).filter((k) => labels.counts[k] > 0);
  const [active, setActive] = useState<Kind>(kinds[0] || 'text');
  const icons = { text: PenLine, audio: Mic, video: Video };

  // Keyboard (WAI-ARIA tabs): arrows move between tabs and follow the reading
  // direction (in Arabic the next tab is on the left), Home/End jump to the ends.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 } as Record<string, number>;
    const i = kinds.indexOf(active);
    let next = -1;
    if (e.key in step) next = (i + step[e.key] + kinds.length) % kinds.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = kinds.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(kinds[next]);
    document.getElementById(`reviews-tab-${kinds[next]}`)?.focus();
  };

  return (
    <div>
      {kinds.length > 1 ? (
        <div role="tablist" aria-orientation="horizontal" onKeyDown={onKey} className="mb-6 flex justify-center gap-2">
          {kinds.map((k) => {
            const Icon = icons[k];
            const on = k === active;
            return (
              <button
                key={k}
                id={`reviews-tab-${k}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`reviews-${k}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(k)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  on ? 'gradient-site gradient-text shadow-md' : 'border border-stroke text-secondary hover:text-foreground'
                }`}
              >
                <Icon size={16} aria-hidden />
                {labels[k]}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? 'bg-white/20' : 'bg-foreground/10'}`}>{labels.counts[k]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div id="reviews-text" role="tabpanel" aria-labelledby={kinds.length > 1 ? `reviews-tab-text` : undefined} hidden={active !== 'text'}>
        {written}
      </div>

      <div id="reviews-audio" role="tabpanel" aria-labelledby={kinds.length > 1 ? `reviews-tab-audio` : undefined} hidden={active !== 'audio'}>
        <VoiceList items={audio} purchaseLabel={labels.purchase} shown={active === 'audio'} />
      </div>

      <div id="reviews-video" role="tabpanel" aria-labelledby={kinds.length > 1 ? `reviews-tab-video` : undefined} hidden={active !== 'video'}>
        <VideoGrid items={video} purchaseLabel={labels.purchase} />
      </div>
    </div>
  );
}
