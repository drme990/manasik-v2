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
import ProductCard from '../shared/product-card';

async function getProducts(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/products?platform=manasik`, {
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
  const products = await getProducts();
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
            <div className="w-full overflow-hidden">
              <div
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 snap-x snap-mandatory scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {products.map((product, index) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    locale={locale}
                    variant="carousel"
                    revealDelayMs={index * 80}
                  />
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              href="/products"
              className="w-fit mx-auto mt-6"
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
