'use client';

import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import Container from '../layout/container';
import WorkCard from '../shared/work-card';
import { useTranslations } from 'next-intl';

export default function WorkSteps() {
  const t = useTranslations('landing.workSteps');

  return (
    <Section id="work-steps">
      <SectionUpTitle className="gbf gbf-md gbf-left gbf-top">
        {t('upTitle')}
      </SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>
      <Container className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12 xl:gap-16">
        <WorkCard
          icon="/icons/tap.gif"
          title={t('steps.step1.title')}
          description={t('steps.step1.description')}
        />
        <WorkCard
          icon="/icons/business.gif"
          title={t('steps.step2.title')}
          description={t('steps.step2.description')}
        />
        <WorkCard
          icon="/icons/media.gif"
          title={t('steps.step3.title')}
          description={t('steps.step3.description')}
        />
      </Container>
    </Section>
  );
}
