'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { canOptimizeImage } from '@/lib/image';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import { useLocale } from 'next-intl';

interface ProductMediaGalleryProps {
  media: string[];
  alt: string;
  fallback?: React.ReactNode;
}

const isVideoUrl = (url: string) => {
  return /\.(mp4|webm|mov|qt)(\?.*)?$/i.test(url) || url.includes('/videos/');
};

/** The slide of `track` that is mostly in view (works the same in RTL and LTR). */
function slideInView(track: HTMLElement): number {
  const box = track.getBoundingClientRect();
  const mid = box.left + box.width / 2;
  let best = 0;
  let bestGap = Infinity;
  Array.from(track.children).forEach((el, i) => {
    const r = (el as HTMLElement).getBoundingClientRect();
    const gap = Math.abs(r.left + r.width / 2 - mid);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  });
  return best;
}

function scrollToSlide(track: HTMLElement | null, index: number, smooth = true) {
  const slide = track?.children[index] as HTMLElement | undefined;
  if (!track || !slide) return;
  // the track's own scroll only (never the page): the slide's start lined up with the track's
  const delta = slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
  track.scrollTo({ left: track.scrollLeft + delta, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * The track follows the index the slides report while being swiped (native scroll: it follows the finger, keeps
 * its momentum and snaps), and pauses a video that leaves the view.
 */
function useTrack(onIndex: (i: number) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const track = ref.current;
      if (!track) return;
      const i = slideInView(track);
      onIndex(i);
      track.querySelectorAll('video').forEach((v) => {
        const slide = v.closest('[data-slide]') as HTMLElement | null;
        if (slide && Number(slide.dataset.slide) !== i && !v.paused) v.pause();
      });
    });
  }, [onIndex]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { ref, onScroll };
}

function Slide({
  url,
  alt,
  index,
  eager,
  fit,
  onOpen,
}: {
  url: string;
  alt: string;
  index: number;
  eager: boolean;
  fit: 'cover' | 'contain';
  onOpen?: () => void;
}) {
  const video = isVideoUrl(url);
  return (
    <div data-slide={index} className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden">
      {video ? (
        <video
          src={/#t=/.test(url) ? url : `${url}#t=0.1`}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full bg-black object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className={`relative block h-full w-full ${onOpen ? 'cursor-zoom-in' : 'cursor-default'}`}
          tabIndex={onOpen ? 0 : -1}
          aria-label={alt}
        >
          {fit === 'cover' ? (
            // the picture's own colors fill the frame around it, so nothing of it is ever cut
            <Image
              src={url}
              alt=""
              aria-hidden
              fill
              draggable={false}
              className="pointer-events-none scale-110 select-none object-cover opacity-70 blur-2xl"
              sizes="(max-width: 768px) 40vw, 20vw"
              loading={eager ? undefined : 'lazy'}
              unoptimized={!canOptimizeImage(url)}
            />
          ) : null}
          <Image
            src={url}
            alt={`${alt} ${index + 1}`}
            fill
            draggable={false}
            className="select-none object-contain"
            sizes={fit === 'cover' ? '(max-width: 768px) 100vw, 50vw' : '100vw'}
            priority={eager && index === 0}
            loading={eager ? undefined : 'lazy'}
            unoptimized={!canOptimizeImage(url)}
          />
        </button>
      )}
    </div>
  );
}

export default function ProductMediaGallery({
  media,
  alt,
  fallback,
}: ProductMediaGalleryProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const [fullIndex, setFullIndex] = useState(0);
  const thumbs = useRef<HTMLDivElement | null>(null);

  const main = useTrack(setIndex);
  const big = useTrack(setFullIndex);

  // the thumbnail of the shown slide stays in view
  useEffect(() => {
    const strip = thumbs.current;
    const th = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !th) return;
    const s = strip.getBoundingClientRect();
    const r = th.getBoundingClientRect();
    if (r.left < s.left || r.right > s.right) {
      strip.scrollTo({ left: strip.scrollLeft + (r.left - s.left) - (s.width - r.width) / 2, behavior: 'smooth' });
    }
  }, [index]);

  // full screen: opened on the slide in view, closed back on the one reached; Esc and the arrow keys work
  const openFull = () => {
    setFullIndex(index);
    setFull(true);
  };
  const closeFull = useCallback(() => {
    setFull(false);
    setIndex(fullIndex);
    requestAnimationFrame(() => scrollToSlide(main.ref.current, fullIndex, false));
  }, [fullIndex, main.ref]);
  useEffect(() => {
    if (!full) return;
    requestAnimationFrame(() => scrollToSlide(big.ref.current, fullIndex, false));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
    // only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFull();
      const step = e.key === 'ArrowRight' ? (isRTL ? -1 : 1) : e.key === 'ArrowLeft' ? (isRTL ? 1 : -1) : 0;
      if (step) scrollToSlide(big.ref.current, Math.min(media.length - 1, Math.max(0, fullIndex + step)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full, closeFull, fullIndex, isRTL, media.length, big.ref]);

  if (!media || media.length === 0) {
    return (
      <div className="w-full aspect-4/3 rounded-site bg-card-bg border border-stroke flex items-center justify-center">
        {fallback || <span className="text-secondary">No Image</span>}
      </div>
    );
  }

  const hasMultiple = media.length > 1;
  const go = (to: number) => scrollToSlide(main.ref.current, (to + media.length) % media.length);
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const noBar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

  return (
    <div className="flex flex-col gap-3">
      {/* the main view: swiped with the finger, snapping to each picture */}
      <div className="group relative w-full aspect-[4/5] sm:aspect-square overflow-hidden rounded-site border border-stroke bg-black">
        <div
          ref={main.ref}
          onScroll={main.onScroll}
          className={`flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${noBar}`}
          role="region"
          aria-roledescription="carousel"
          aria-label={alt}
        >
          {media.map((url, i) => (
            <Slide key={`${url}-${i}`} url={url} alt={alt} index={i} eager={i <= 1} fit="cover" onOpen={openFull} />
          ))}
        </div>

        {hasMultiple ? (
          <>
            {/* where we are */}
            <span className="pointer-events-none absolute top-3 end-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm" dir="ltr">
              {index + 1} / {media.length}
            </span>

            {/* arrows: on hover with a mouse, always a tap away on a screen without one */}
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute start-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-lg backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white active:scale-95 md:opacity-0 md:group-hover:opacity-100 max-md:h-8 max-md:w-8 max-md:bg-black/35 max-md:text-white max-md:shadow-none"
              aria-label={isRTL ? 'الصورة السابقة' : 'Previous'}
            >
              <PrevIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute end-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-lg backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white active:scale-95 md:opacity-0 md:group-hover:opacity-100 max-md:h-8 max-md:w-8 max-md:bg-black/35 max-md:text-white max-md:shadow-none"
              aria-label={isRTL ? 'الصورة التالية' : 'Next'}
            >
              <NextIcon size={20} />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  className={`pointer-events-auto h-2 rounded-full shadow-sm transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'}`}
                  aria-label={`${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        ) : null}

        {!isVideoUrl(media[index] || '') ? (
          <button
            type="button"
            onClick={openFull}
            className="absolute bottom-3 end-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            aria-label={isRTL ? 'عرض بالحجم الكامل' : 'View full size'}
          >
            <Expand size={15} />
          </button>
        ) : null}
      </div>

      {/* thumbnails */}
      {hasMultiple && (
        <div ref={thumbs} className={`flex gap-2 overflow-x-auto p-0.5 ${noBar}`}>
          {media.map((mediaUrl, i) => {
            const isVideo = isVideoUrl(mediaUrl || '');
            const on = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
                aria-current={on}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black transition-all duration-300 ${on ? 'ring-2 ring-success ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}
              >
                {isVideo ? (
                  <>
                    <video src={/#t=/.test(mediaUrl) ? mediaUrl : `${mediaUrl}#t=0.1`} className="h-full w-full object-cover opacity-60" preload="metadata" muted playsInline />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Play size={20} className="text-white drop-shadow-md" />
                    </span>
                  </>
                ) : (
                  <Image
                    src={mediaUrl}
                    alt={`${alt} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={!canOptimizeImage(mediaUrl)}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* full screen */}
      {full ? (
        <div className="pmg-full fixed inset-0 z-[120] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={alt}>
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] text-white">
            <span className="text-sm font-semibold tabular-nums" dir="ltr">
              {fullIndex + 1} / {media.length}
            </span>
            <button
              type="button"
              onClick={closeFull}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 transition-colors hover:bg-white/25"
              aria-label={isRTL ? 'إغلاق' : 'Close'}
            >
              <X size={22} />
            </button>
          </div>
          <div
            ref={big.ref}
            onScroll={big.onScroll}
            className={`flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${noBar}`}
          >
            {media.map((url, i) => (
              <Slide key={`${url}-f-${i}`} url={url} alt={alt} index={i} eager={Math.abs(i - fullIndex) <= 1} fit="contain" />
            ))}
          </div>
          {hasMultiple ? (
            <div className="flex items-center justify-center gap-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => scrollToSlide(big.ref.current, (fullIndex - 1 + media.length) % media.length)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/25"
                aria-label={isRTL ? 'الصورة السابقة' : 'Previous'}
              >
                <PrevIcon size={22} />
              </button>
              <div className="flex gap-1.5">
                {media.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === fullIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => scrollToSlide(big.ref.current, (fullIndex + 1) % media.length)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/25"
                aria-label={isRTL ? 'الصورة التالية' : 'Next'}
              >
                <NextIcon size={22} />
              </button>
            </div>
          ) : null}
          <style>{`.pmg-full{animation:pmg-in .22s ease-out both}@keyframes pmg-in{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.pmg-full{animation:none}}`}</style>
        </div>
      ) : null}
    </div>
  );
}
