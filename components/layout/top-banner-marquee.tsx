'use client';

import Marquee from 'react-fast-marquee';
import { useLocale } from 'next-intl';
import { useAppearance } from '@/components/providers/appearance-provider';

export default function TopBannerMarquee() {
  const { appearance } = useAppearance();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const bannerText = (
    isAr ? appearance?.bannerText?.ar : appearance?.bannerText?.en
  )?.trim();

  if (!bannerText) return null;

  return (
    <div
      className="gradient-site gradient-text relative h-8 w-full overflow-hidden border-b border-black/10"
      dir="ltr"
    >
      <Marquee
        speed={40}
        autoFill
        gradient={false}
        loop={0}
        direction={isAr ? 'left' : 'right'}
        className="h-full overflow-hidden"
      >
        <span className="flex items-center whitespace-nowrap px-8 text-sm font-semibold uppercase tracking-[0.18em]">
          {bannerText}
        </span>
      </Marquee>
    </div>
  );
}
