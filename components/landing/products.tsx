import Container from '../layout/container';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import { getTranslations, getLocale } from 'next-intl/server';
import LandingProductsClient from './products-client';

export default async function Products() {
  const t = await getTranslations('landing.products');
  const locale = await getLocale();

  return (
    <Section id="products">
      <SectionUpTitle>{t('upTitle')}</SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle
        className="gbf gbf-right"
        style={
          {
            '--gbf-size': '300px',
          } as React.CSSProperties
        }
      >
        {t('subtitle')}
      </SectionSubtitle>

      <Container>
        <LandingProductsClient platform="manasik" locale={locale} />
      </Container>
    </Section>
  );
}
