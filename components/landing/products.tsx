import Image from 'next/image';
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
import ProductPrice from '../shared/product-price';

async function getProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.BASE_URL;
    const res = await fetch(`${baseUrl}/api/products`, {
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

function ProductCard({
  product,
  t,
  locale,
}: {
  product: Product;
  t: (key: string) => string;
  locale: string;
}) {
  const showSizeSelector = product.sizes.length > 1;
  // Always use sizes — find the cheapest
  const cheapestSize = product.sizes.reduce((best, s) =>
    (s.price ?? 0) <= (best.price ?? 0) ? s : best,
  );
  const displayPrice = cheapestSize.price ?? 0;
  const displayPrices = cheapestSize.prices ?? [];

  return (
    <div className="shrink-0 w-64 border border-stroke rounded-site overflow-hidden bg-card-bg hover:border-success/30 transition-all duration-300">
      {product.images?.[0] ? (
        <div className="relative w-full h-40 overflow-hidden">
          <Image
            src={product.images[0]}
            alt={locale === 'ar' ? product.name.ar : product.name.en}
            fill
            className="object-cover"
            sizes="256px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-stroke/10 flex items-center justify-center">
          <span className="text-secondary text-sm">{t('status.noImage')}</span>
        </div>
      )}
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-base font-semibold leading-snug line-clamp-2 min-h-10">
          {locale === 'ar' ? product.name.ar : product.name.en}
        </h3>
        <ProductPrice
          prices={displayPrices}
          defaultPrice={displayPrice}
          defaultCurrency={product.baseCurrency}
          className="text-success font-bold text-lg"
          prefix={showSizeSelector ? t('buttons.startsFrom') : undefined}
        />
        <Button variant="primary" size="sm" href={`/products/${product._id}`}>
          {t('buttons.orderNow')}
        </Button>
      </div>
    </div>
  );
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
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    t={tc}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              href="/products"
              className="mx-auto mt-6"
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
