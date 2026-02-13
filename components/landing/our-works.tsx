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
    <div className="flex items-center gap-4 w-full rounded-xl border border-stroke bg-card-bg/30 backdrop-blur-sm px-5 py-4">
      <div className="relative w-10 h-10 shrink-0">
        <Image src={icon} alt={label} fill className="object-contain" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-success font-bold text-lg">{value}</span>
        <span className="text-foreground text-sm">{label}</span>
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
    <div className="relative w-64 h-44 shrink-0 mx-2 overflow-hidden rounded-site">
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
  { icon: '/icons/earth.svg', key: 'countries' },
  { icon: '/icons/earth.svg', key: 'completedWorks' },
  { icon: '/icons/earth.svg', key: 'satisfaction' },
  { icon: '/icons/earth.svg', key: 'happyClients' },
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

      <div className="flex flex-col gap-3 mb-10" dir="ltr">
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

      <Container>
        <div className="flex flex-col items-center gap-3">
          {stats.map((stat, index) => (
            <StatisticsCard
              key={index}
              icon={stat.icon}
              value={t(`stats.${stat.key}.value`)}
              label={t(`stats.${stat.key}.label`)}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
