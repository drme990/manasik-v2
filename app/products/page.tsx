import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import PageTitle from '@/components/shared/page-title';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import OutstandingBalanceWarning from '@/components/shared/outstanding-balance-warning';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import CalcAqeqa from '@/components/landing/calc-aqeqa';
import ProductCard from '@/components/shared/product-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('products');

  return {
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
      url: 'https://www.manasik.net/products',
      siteName: 'Manasik',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    alternates: {
      canonical: 'https://www.manasik.net/products',
    },
  };
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
      <OutstandingBalanceWarning />
      <main className="grid-bg min-h-screen">
        <Container>
          <div className="flex items-center gap-3 pt-8 mb-6">
            <BackButton />
          </div>
          <PageTitle>{t('title')}</PageTitle>

          {productsWithSlug.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-secondary text-lg mb-2">{t('noProducts')}</p>
              <p className="text-secondary/70 text-sm">{t('comingSoon')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 pb-16">
              {productsWithSlug.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </Container>
        <CalcAqeqa />
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
