'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useAppearance } from '../providers/appearance-provider';
import { useLocale } from 'next-intl';
import { useReels } from '@/components/reels/use-reels';
import type { Reel } from '@/lib/reels';
import '@/components/reels/reels.css';

const ReelsViewer = dynamic(() => import('@/components/reels/reels-viewer'), { ssr: false });

/** A banner whose link is a video file on our storage plays it here, in the reels player (owner, 2026-10-16). */
function isVideoFile(link: string | undefined): link is string {
  return typeof link === 'string' && /^https:\/\//i.test(link) && (/\.(mp4|webm|mov)(\?.*)?$/i.test(link) || link.includes('/videos/'));
}

const autoplay = Autoplay({
  delay: 4000,
  stopOnInteraction: false,
});

export default function ProductsBannersCarousel() {
  const { appearance } = useAppearance();
  const locale = useLocale();

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      direction: locale === 'ar' ? 'rtl' : 'ltr',
    },
    [autoplay],
  );

  // Force re-render when Embla changes slides
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const onSelect = useCallback(() => {
    forceUpdate();
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const selectedIndex = emblaApi?.selectedScrollSnap() ?? 0;

  // A banner linking to a video file (an endorsement's motion video, say) opens it in the site's own reels player
  // instead of sending the visitor away to YouTube (owner, 2026-10-16); swiping then carries on through the reels.
  const hasVideo = appearance.productsBanners.some((banner) => isVideoFile(banner.link));
  const { reels, productsById } = useReels();
  const [playing, setPlaying] = useState<{ list: Reel[]; start: string } | null>(null);
  const close = useCallback(() => setPlaying(null), []);
  const openVideo = useCallback(
    (bannerId: string, video: string, transcript?: string) => {
      const known = reels.find((reel) => reel.video.trim() === video.trim());
      if (known) {
        setPlaying({ list: transcript ? reels.map((reel) => (reel.id === known.id ? { ...reel, caption: transcript } : reel)) : reels, start: known.id });
        return;
      }
      // The approved words said in the video (a sheikh's endorsement, owner 2026-10-17) are its caption: two lines
      // and «المزيد» to read all of it.
      const own: Reel = { id: `banner-${bannerId}`, video, poster: null, caption: transcript ?? '', productId: null, productSlug: null, productName: null, source: 'dashboard', lead: false };
      setPlaying({ list: [own, ...reels], start: own.id });
    },
    [reels],
  );
  const viewer = useMemo(
    () => (playing ? <ReelsViewer reels={playing.list} productsById={productsById} start={playing.start} onClose={close} /> : null),
    [playing, productsById, close],
  );

  return (
    <div
      data-mo="pop"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="mx-auto [--slide-spacing:0.75rem] [--slide-size:85%] mb-8"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pinch-zoom">
          {appearance.productsBanners.map((banner, index) => isVideoFile(banner.link) ? (
            <button
              key={index}
              type="button"
              onClick={() => openVideo(banner.id ?? String(index), banner.link, banner.transcript)}
              className="min-w-0 pl-(--slide-spacing) flex-[0_0_var(--slide-size)] translate-x-0 translate-y-0 translate-z-0 aspect-15/7 text-start"
            >
              <Image
                src={banner.imageUrl}
                alt={`Banner ${index + 1}`}
                width={1200}
                height={500}
                sizes="(max-width: 768px) 85vw, 1000px"
                className="h-auto w-full overflow-hidden rounded-site border border-stroke object-cover"
              />
            </button>
          ) : (
            <Link
              key={index}
              href={banner.link}
              rel="noopener noreferrer"
              className="min-w-0 pl-(--slide-spacing) flex-[0_0_var(--slide-size)] translate-x-0 translate-y-0 translate-z-0 aspect-15/7"
            >
              <Image
                src={banner.imageUrl}
                alt={`Banner ${index + 1}`}
                width={1200}
                height={500}
                sizes="(max-width: 768px) 85vw, 1000px"
                className="h-auto w-full overflow-hidden rounded-site border border-stroke object-cover"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* The dots look exactly as before; each one's button is taller than its dot (and the gap between dots is
          the buttons' own padding), so a finger finds it more easily. */}
      <div className="mt-[calc(1rem-7px)] -mb-[7px] flex justify-center">
        {appearance.productsBanners.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className="flex items-center px-1 py-[7px]"
          >
            <span
              aria-hidden="true"
              className={`block h-2.5 rounded-full transition-all duration-300 ${selectedIndex === index
                  ? 'bg-primary w-6'
                  : 'bg-gray-300 dark:bg-gray-600 w-2.5'
                }`}
            />
          </button>
        ))}
      </div>
      {hasVideo ? viewer : null}
    </div>
  );
}
