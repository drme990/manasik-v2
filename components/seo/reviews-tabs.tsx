'use client';

import { useState } from 'react';
import { BadgeCheck, Mic, PenLine, Star, Video } from 'lucide-react';
import CountryFlag from '@/components/shared/country-flag';
import type { SharedMedia } from '@/lib/seo-content';

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
  const verified = item.id.startsWith('exp-') && item.rating !== undefined;
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
        {item.rating ? <Stars rating={item.rating} /> : null}
      </div>
    </header>
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

  return (
    <div>
      {kinds.length > 1 ? (
        <div role="tablist" className="mb-6 flex justify-center gap-2">
          {kinds.map((k) => {
            const Icon = icons[k];
            const on = k === active;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`reviews-${k}`}
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

      <div id="reviews-text" role="tabpanel" hidden={active !== 'text'}>
        {written}
      </div>

      <div id="reviews-audio" role="tabpanel" hidden={active !== 'audio'}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audio.map((item) => (
            <figure key={item.id} className="flex flex-col gap-3 rounded-site border border-stroke bg-card-bg p-5">
              <Person item={item} purchaseLabel={labels.purchase} />
              <audio src={item.url} controls preload="none" className="w-full" />
            </figure>
          ))}
        </div>
      </div>

      <div id="reviews-video" role="tabpanel" hidden={active !== 'video'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {video.map((item) => (
            <figure key={item.id} className="flex flex-col gap-3 rounded-site border border-stroke bg-card-bg p-4">
              <Person item={item} purchaseLabel={labels.purchase} />
              <video
                // #t=0.1 shows a frame instead of black before it plays.
                src={`${item.url}#t=0.1`}
                controls
                playsInline
                preload="metadata"
                className="aspect-[9/16] max-h-[70vh] w-full rounded-xl bg-black object-contain"
              />
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
