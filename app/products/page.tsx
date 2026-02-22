import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import PageTitle from '@/components/shared/page-title';
import ProductPrice from '@/components/shared/product-price';
import Button from '@/components/ui/button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Image from 'next/image';
import { Product } from '@/types/Product';
import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('products');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: 'https://www.manasik.net/products',
    },
  };
}

// Revalidate every 5 minutes
export const revalidate = 300;

async function getProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.BASE_URL;
    const res = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
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
  const isAr = locale === 'ar';
  const productName = isAr ? product.name.ar : product.name.en;
  const showSizeSelector = product.sizes.length > 1;
  const cheapestSize = product.sizes.reduce((best, s) =>
    (s.price ?? 0) <= (best.price ?? 0) ? s : best,
  );
  const displayPrice = cheapestSize.price ?? 0;
  const displayPrices = cheapestSize.prices ?? [];

  return (
    <div className="group border border-stroke rounded-site overflow-hidden bg-card-bg transition-all duration-300 hover:shadow-lg hover:border-success/30">
      {product.images?.[0] ? (
        <div className="relative overflow-hidden">
          <Image
            src={product.images[0]}
            alt={productName}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            width={400}
            height={192}
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-stroke/10 flex items-center justify-center">
          <span className="text-secondary text-sm">{t('noImage')}</span>
        </div>
      )}
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-base font-semibold leading-snug line-clamp-2">
          {productName}
        </h3>
        <ProductPrice
          prices={displayPrices}
          defaultPrice={displayPrice}
          defaultCurrency={product.baseCurrency}
          className="text-success font-bold text-lg"
          prefix={showSizeSelector ? t('startsFrom') : undefined}
        />
        <Button variant="primary" size="sm" href={`/products/${product._id}`}>
          {t('orderNow')}
        </Button>
      </div>
    </div>
  );
}

export default async function ProductsPage() {
  const locale = await getLocale();
  const products = await getProducts();
  const t = await getTranslations('products');

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container>
          <div className="flex items-center gap-3 pt-8 mb-6">
            <BackButton />
          </div>
          <PageTitle>{t('title')}</PageTitle>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-secondary text-lg mb-2">{t('noProducts')}</p>
              <p className="text-secondary/70 text-sm">{t('comingSoon')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 pb-16">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
