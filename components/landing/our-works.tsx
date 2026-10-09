'use client';

import AnimatedIcon from '@/components/shared/animated-icon';
import Odometer from '@/components/motion/odometer';
import Image from 'next/image';
import Marquee from 'react-fast-marquee';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import Container from '../layout/container';
import { useTranslations } from 'next-intl';
import { useAppearance } from '../providers/appearance-provider';

// Tiny 4x6 transparent shimmer placeholder (matches card aspect ratio ~256×295)
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI5NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+';

function normalizeGalleryImageUrl(url: string): string {
  return url;
}

export function StatisticsCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div data-mo="card" className="flex items-center gap-4 w-full rounded-xl border border-stroke bg-card-bg backdrop-blur-sm p-4">
      <div className="relative w-16 h-16 shrink-0" data-mo-icon>
        <AnimatedIcon src={icon} alt={label} className="absolute inset-0 w-full h-full object-contain" />
      </div>
      <div className="flex flex-col items-center w-full">
        <span className="g-text font-bold text-2xl g-text">
          <Odometer value={value} />
        </span>
        <span className="text-foreground text-base">{label}</span>
      </div>
    </div>
  );
}

function WorkCard({ src }: { src: string }) {
  return (
    <div className="relative w-[256px] h-73.75 shrink-0 mx-2 overflow-hidden rounded-site">
      <Image
        src={normalizeGalleryImageUrl(src)}
        alt="Work Image"
        fill
        className="object-cover"
        sizes="256px"
        quality={75}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        loading="eager"
      />
    </div>
  );
}

/**
 * The live count from the server (orders, customers, countries — rounded down, refreshed hourly), "+21,900";
 * null keeps the fixed text (and "satisfaction", which is not counted).
 */
function liveValue(key: string, live: { completedWorks?: number; happyClients?: number; countries?: number } | null | undefined): string | null {
  const value = key === 'completedWorks' || key === 'happyClients' || key === 'countries' ? live?.[key] : undefined;
  return typeof value === 'number' && value > 0 ? `+${value.toLocaleString('en-US')}` : null;
}

const stats = [
  { icon: '/icons/global.gif', key: 'countries' },
  { icon: '/icons/true.gif', key: 'completedWorks' },
  { icon: '/icons/happy.gif', key: 'happyClients' },
  { icon: '/icons/card.gif', key: 'satisfaction' },
];

export default function OurWorks() {
  const t = useTranslations('landing.ourWorks');
  const { appearance } = useAppearance();

  return (
    <>
      <div className="h-10 w-full bg-linear-to-b from-background via-background/50 to-background/10" />
      <Section id="our-works" className="px-0">
        <SectionUpTitle>{t('upTitle')}</SectionUpTitle>
        <SectionTitle>{t('title')}</SectionTitle>
        <SectionSubtitle className="gbf gbf-md gbf-left">
          {t('subtitle')}
        </SectionSubtitle>

        <div className="flex flex-col gap-6 mb-16" dir="ltr">
          <div data-mo="from-start">
          <Marquee
            direction="right"
            speed={35}
            gradient={true}
            gradientColor="var(--marquee-bg)"
            gradientWidth={75}
            autoFill
          >
            {appearance.worksImages.row1.map((src, index) => (
              <WorkCard key={`row1-${index}`} src={src} />
            ))}
          </Marquee>
          </div>
          <div data-mo="from-end">
          <Marquee
            direction="left"
            speed={35}
            gradient={true}
            gradientColor="var(--marquee-bg)"
            gradientWidth={75}
            autoFill
          >
            {appearance.worksImages.row2.map((src, index) => (
              <WorkCard key={`row2-${index}`} src={src} />
            ))}
          </Marquee>
          </div>
        </div>

        <div className="px-5 md:px-8 pt-5">
          <Container className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10">
            {stats.map((stat, index) => (
              <StatisticsCard
                key={index}
                icon={stat.icon}
                value={liveValue(stat.key, appearance.liveStats) ?? t(`stats.${stat.key}.value`)}
                label={t(`stats.${stat.key}.label`)}
              />
            ))}
          </Container>
        </div>
      </Section>
    </>
  );
}
