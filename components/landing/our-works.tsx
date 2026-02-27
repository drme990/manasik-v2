'use client';

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

// Tiny 4x6 transparent shimmer placeholder (matches card aspect ratio ~256×295)
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI5NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+';

/**
 * Add Cloudinary transforms for pre-optimized delivery:
 * - w_512 (256px × 2 for retina)
 * - q_auto (automatic quality)
 * - f_auto (avif/webp based on browser)
 * - c_fill for consistent crop
 */
function optimizeCloudinaryUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  // Insert transforms after /upload/
  return url.replace('/upload/', '/upload/w_512,h_590,c_fill,q_auto,f_auto/');
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
    <div className="flex items-center gap-4 w-full rounded-xl border border-stroke bg-card-bg backdrop-blur-sm p-4">
      <div className="relative w-16 h-16 shrink-0">
        <Image
          src={icon}
          alt={label}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <div className="flex flex-col items-center w-full">
        <span className="g-text font-bold text-2xl g-text">{value}</span>
        <span className="text-foreground text-base">{label}</span>
      </div>
    </div>
  );
}

function WorkCard({ src }: { src: string }) {
  return (
    <div className="relative w-[256px] h-73.75 shrink-0 mx-2 overflow-hidden rounded-site">
      <Image
        src={optimizeCloudinaryUrl(src)}
        alt="Work Image"
        fill
        className="object-cover"
        sizes="256px"
        quality={75}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        loading="eager"
        unoptimized
      />
    </div>
  );
}

const stats = [
  { icon: '/icons/global.gif', key: 'countries' },
  { icon: '/icons/true.gif', key: 'completedWorks' },
  { icon: '/icons/card.gif', key: 'satisfaction' },
  { icon: '/icons/happy.gif', key: 'happyClients' },
];

export default function OurWorks({
  row1 = [],
  row2 = [],
}: {
  row1?: string[];
  row2?: string[];
}) {
  const t = useTranslations('landing.ourWorks');

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
          <Marquee
            direction="right"
            speed={35}
            gradient={true}
            gradientColor="var(--marquee-bg)"
            gradientWidth={75}
            autoFill
          >
            {row1.map((src, index) => (
              <WorkCard key={`row1-${index}`} src={src} />
            ))}
          </Marquee>
          <Marquee
            direction="left"
            speed={35}
            gradient={true}
            gradientColor="var(--marquee-bg)"
            gradientWidth={75}
            autoFill
          >
            {row2.map((src, index) => (
              <WorkCard key={`row2-${index}`} src={src} />
            ))}
          </Marquee>
        </div>

        <div className="px-5 md:px-8 pt-5">
          <Container className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10">
            {stats.map((stat, index) => (
              <StatisticsCard
                key={index}
                icon={stat.icon}
                value={t(`stats.${stat.key}.value`)}
                label={t(`stats.${stat.key}.label`)}
              />
            ))}
          </Container>
        </div>
      </Section>
    </>
  );
}
