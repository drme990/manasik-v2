import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import PageTitle from '@/components/shared/page-title';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import CalcAqeqa from '@/components/landing/calc-aqeqa';
import ProductsWithLabelFilter from '@/components/products/products-with-label-filter';
import ProductsBannersCarousel from '@/components/products/products-banners-carousel';

import { getSeoMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'products' });

  return getSeoMetadata({
    locale,
    path: '/products',
    title: t('title'),
    description: t('description'),
    keywords: [
      'مناسك',
      'عقيقة',
      'أضاحي',
      'عمرة البدل',
      'حج البدل',
      'خدمات دينية',
    ],
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: 'Manasik',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  });
}

// Revalidate every 5 minutes
export const revalidate = 300;

async function getProducts(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/products?platform=manasik`, {
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

export default async function ProductsPage() {
  const locale = await getLocale();
  const products = await getProducts();
  const t = await getTranslations('products');
  const productsWithSlug = products.filter((product) => product.slug);

  const productsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'منتجات مؤسسة مناسك',
    description:
      'تصفح جميع خدمات مؤسسة مناسك: عمرة البدل، حج البدل، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار.',
    url: 'https://www.manasik.net/products',
    numberOfItems: productsWithSlug.length,
    itemListElement: productsWithSlug.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name.ar,
      url: `https://www.manasik.net/products/${product.slug}`,
      image: getPrimaryProductImageUrl(product),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productsJsonLd) }}
      />
      <Header />
      <main className="grid-bg min-h-screen">
        <Container>
          <div className="grid grid-cols-3 gap-3 pt-14 mb-12">
            <div>
              <BackButton />
            </div>
            <PageTitle className="mb-0">{t('title')}</PageTitle>
          </div>
        </Container>

        <ProductsBannersCarousel />

        <Container>
          {productsWithSlug.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-secondary text-lg mb-2">{t('noProducts')}</p>
              <p className="text-secondary/70 text-sm">{t('comingSoon')}</p>
            </div>
          ) : (
            <ProductsWithLabelFilter
              products={productsWithSlug}
              locale={locale}
            />
          )}
          <CalcAqeqa />
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
