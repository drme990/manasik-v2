'use client';

import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useAppearance } from '../providers/appearance-provider';

const autoplay = Autoplay({
  delay: 4000,
  stopOnInteraction: false,
});

export default function ProductsBannersCarousel() {
  const { appearance } = useAppearance();

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
    },
    [autoplay],
  );

  return (
    <div
      dir="ltr"
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
                height={400}
                className="h-auto w-full overflow-hidden rounded-site object-cover"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
