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
  { key: 'benefit1', icon: '/icons/prize.gif' },
  { key: 'benefit2', icon: '/icons/checkmark-badge.svg' },
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
      <Container className="flex flex-col items-center gap-16">
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
