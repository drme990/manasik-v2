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
    <div className="flex items-center gap-4 w-full rounded-xl border border-stroke bg-card-bg/30 backdrop-blur-sm p-4">
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

const images = [
  '/works/1.jpg',
  '/works/2.jpg',
  '/works/3.jpg',
  '/works/4.jpg',
  '/works/5.jpg',
  '/works/6.jpg',
];

function WorkCard({ src }: { src: string }) {
  return (
    <div className="relative w-[256px] h-73.75 shrink-0 mx-2 overflow-hidden rounded-site">
      <Image
        src={src}
        alt="Work Image"
        fill
        className="object-cover"
        sizes="256px"
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

export default function OurWorks() {
  const t = useTranslations('landing.ourWorks');

  return (
    <Section id="our-works" className="px-0">
      <SectionUpTitle>{t('upTitle')}</SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle className="gbf gbf-md gbf-left">
        {t('subtitle')}
      </SectionSubtitle>

      <div className="flex flex-col gap-6 mb-16" dir="ltr">
        <Marquee direction="right" speed={35} gradient={false} autoFill>
          {images.map((src, index) => (
            <WorkCard key={`row1-${index}`} src={src} />
          ))}
        </Marquee>
        <Marquee direction="left" speed={35} gradient={false} autoFill>
          {images.map((src, index) => (
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
  );
}
