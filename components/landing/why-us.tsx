'use client';

import Container from '../layout/container';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import WorkCard from '../shared/work-card';
import { useTranslations } from 'next-intl';

const benefits = [
  { key: 'benefit1', icon: '/icons/group.gif' },
  { key: 'benefit2', icon: '/icons/prize.gif' },
  { key: 'benefit3', icon: '/icons/heart.gif' },
  { key: 'benefit4', icon: '/icons/time.gif', hasBlur: true },
  { key: 'benefit5', icon: '/icons/dollar.gif' },
  { key: 'benefit6', icon: '/icons/smile.gif' },
];

export default function WhyUs() {
  const t = useTranslations('landing.whyUs');

  return (
    <Section id="why-us">
      <SectionUpTitle>{t('upTitle')}</SectionUpTitle>
      <SectionTitle className="gbf gbf-sm">{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>
      <Container className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12 xl:gap-16">
        {benefits.map((benefit, index) => (
          <WorkCard
            key={index}
            icon={benefit.icon}
            title={t(`${benefit.key}.title`)}
            description={t(`${benefit.key}.description`)}
            className={benefit.hasBlur ? 'gbf gbf-lg gbf-right gbf-bottom' : ''}
          />
        ))}
      </Container>
    </Section>
  );
}
