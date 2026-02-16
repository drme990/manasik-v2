'use client';

import Container from '../layout/container';
import { Section } from '../layout/section';
import Button from '../ui/button';
import { useTranslations } from 'next-intl';

export function AqeqaCard() {
  const t = useTranslations('landing.calcAqeqa');

  return (
    <div className="w-full bg-card-bg flex flex-col items-center gap-6 rounded-site border border-stroke p-6 mx-auto text-center">
      <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
      <p className="text-secondary text-base leading-relaxed">
        {t('description')}
      </p>
      <Button className="w-full" href="/calc-aqeqa">
        {t('button')}
      </Button>
    </div>
  );
}

export default function CalcAqeqa() {
  return (
    <Section id="calc-aqeqa">
      <Container>
        <AqeqaCard />
      </Container>
      <div className="gbf gbf-lg gbf-bottom h-1"></div>
    </Section>
  );
}
