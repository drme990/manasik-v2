import Container from '../layout/container';
import Button from '../ui/button';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import { Product } from '@/types/Product';
import { getTranslations, getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import LandingProductsWithFilter from '@/components/landing/products-with-filter';

async function getProducts(viewerCountryCode: string): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const params = new URLSearchParams({ platform: 'manasik' });
    if (viewerCountryCode) params.set('viewerCountryCode', viewerCountryCode);
    const res = await fetch(`${backendUrl}/api/products?${params.toString()}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.success ? data.data.products : [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function Products() {
  const cookieStore = await cookies();
  const viewerCountryCode = cookieStore.get('manasik-home-country')?.value || '';
  const products = await getProducts(viewerCountryCode);
  const t = await getTranslations('landing.products');
  const tc = await getTranslations('common');
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
        {products.length > 0 ? (
          <>
            <LandingProductsWithFilter products={products} locale={locale} />
            <Button
              variant="primary"
              size="md"
              href="/products"
              className="w-fit mx-auto mt-6"
              data-ref-track-action="navigate_products"
              data-ref-track-button-label={t('buttons.viewAll')}
              data-ref-track-meta={JSON.stringify({
                source: 'landing_products',
              })}
            >
              {t('buttons.viewAll')}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-secondary text-base">
              {tc('messages.noProductsAvailable')}
            </p>
          </div>
        )}
      </Container>
    </Section>
  );
}
