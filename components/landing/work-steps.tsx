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
      <Container className="flex flex-col items-center gap-6">
        <WorkCard
          icon="/icons/workflow-square.svg"
          title={t('steps.step1.title')}
          description={t('steps.step1.description')}
        />
        <WorkCard
          icon="/icons/workflow-square.svg"
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
