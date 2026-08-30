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
import ProductsListClient from '@/components/products/products-list-client';
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

/**
 * Fetch products WITHOUT viewerCountryCode for JSON-LD structured data.
 * JSON-LD only needs product names, URLs, and images — not prices.
 * Prices are resolved client-side after the country is detected.
 */
async function getProductsForSeo(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const params = new URLSearchParams({ platform: 'manasik' });
    const res = await fetch(`${backendUrl}/api/products?${params.toString()}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.success ? data.data.products : [];
  } catch (error) {
    console.error('Error fetching products for SEO:', error);
    return [];
  }
}

export default async function ProductsPage() {
  const locale = await getLocale();
  const t = await getTranslations('products');

  // Fetch products for JSON-LD only (no viewerCountryCode needed)
  const products = await getProductsForSeo();
  const productsWithSlug = products.filter((product) => product.slug);

  const productsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'منتجات مؤسسة مناسك',
    description:
      'تصفح جميع خدمات مؤسسة مناسك: عمرة البدل، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار.',
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
          <ProductsListClient platform="manasik" locale={locale} />
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
