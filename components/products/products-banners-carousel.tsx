'use client';

import { useCallback, useEffect, useReducer } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useAppearance } from '../providers/appearance-provider';
import { useLocale } from 'next-intl';

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

  return (
    <div
      data-mo="pop"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="mx-auto [--slide-spacing:0.75rem] [--slide-size:85%] mb-8"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pinch-zoom">
          {appearance.productsBanners.map((banner, index) => (
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
    </div>
  );
}
