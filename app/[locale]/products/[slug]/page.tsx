import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Product, getPrimaryProductImageUrl } from '@/types/Product';
import { Metadata } from 'next';
import { getSeoMetadata, buildProductSchema, buildBreadcrumbSchema } from '@/lib/seo';
import { trackViewContent } from '@/lib/fb-capi';
import { getViewerCountryCode } from '@/lib/viewer-country';
import ProductDetailsClient from './product-details-client';
import Testimonials from '@/components/landing/testimonials';
import FAQDisplay from '@/components/shared/faq-display';

async function getProduct(id: string, viewerCountryCode: string): Promise<Product | null> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const params = new URLSearchParams({ platform: 'manasik' });
    if (viewerCountryCode) params.set('viewerCountryCode', viewerCountryCode);
    const res = await fetch(
      `${backendUrl}/api/products/${id}?${params.toString()}`,
      {
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const viewerCountryCode = await getViewerCountryCode('manasik-home-country');
  const product = await getProduct(slug, viewerCountryCode);

  if (!product) {
    return {
      title: { absolute: locale === 'ar' ? 'المنتج غير موجود | مؤسسة مناسك' : 'Product Not Found | Manasik Foundation' },
    };
  }

  const productName = product.name[locale as 'ar' | 'en'] || product.name.ar;
  const productDescription =
    product.content?.[locale as 'ar' | 'en']
      ?.replace(/<[^>]*>/g, '')
      .slice(0, 160)
      .trim() || productName;
  // Read base price from resolvedPrices (first entry)
  const firstSize = product.sizes?.[0];
  const basePriceForSeo = firstSize?.resolvedPrices?.[0]?.amount ?? 0;
  const productPrice = `${basePriceForSeo} ${product.baseCurrency}`;
  const primaryImage = getPrimaryProductImageUrl(product);
  const isAr = locale === 'ar';
  const brandName = isAr ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: `/products/${slug}`,
    title: `${productName} | ${brandName}`,
    description: isAr
      ? `${productDescription} - السعر: ${productPrice}`
      : `${productDescription} - Price: ${productPrice}`,
    keywords: [
      product.name.ar,
      product.name.en,
      'مناسك',
      'عقيقة',
      'أضاحي',
      'عمرة البدل',
      'manasik',
      'aqiqah',
      'qurbani',
      'umrah proxy',
    ],
    openGraph: {
      title: `${productName} | ${brandName}`,
      description: productDescription,
      siteName: brandName,
      type: 'website',
      images: primaryImage ? [primaryImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} | ${brandName}`,
      description: productDescription,
      images: primaryImage ? [primaryImage] : [],
    },
  });
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const viewerCountryCode = await getViewerCountryCode('manasik-home-country');
  const product = await getProduct(slug, viewerCountryCode);

  if (!product) {
    notFound();
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    '';
  const ua = hdrs.get('user-agent') || '';

  const lowestPrice = product.sizes?.length
    ? Math.min(
      ...product.sizes.map(
        (s) => s.resolvedPrices?.[0]?.amount ?? 0,
      ),
    )
    : 0;
  const canonicalPath = product.slug;
  const primaryImage = getPrimaryProductImageUrl(product);
  const baseUrl = (process.env.BASE_URL || 'https://www.manasik.net').replace(/\/$/, '');

  const productJsonLd = buildProductSchema(locale, product, baseUrl, primaryImage);

  const breadcrumbJsonLd = buildBreadcrumbSchema(locale, [
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', path: '/' },
    { name: locale === 'ar' ? 'المنتجات' : 'Products', path: '/products' },
    { name: product.name[locale as 'ar' | 'en'] || product.name.ar, path: `/products/${canonicalPath}` },
  ], baseUrl);

  trackViewContent({
    productId: product._id,
    productName: product.name.en || product.name.ar,
    value: lowestPrice,
    currency: product.baseCurrency || 'SAR',
    sourceUrl: `https://www.manasik.net/products/${canonicalPath}`,
    userData: { client_ip_address: ip, client_user_agent: ua },
  }).catch(() => { });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      <main className="grid-bg min-h-dvh">
        <Container>
          <div className="flex items-center gap-3 pt-8 mb-8">
            <BackButton />
          </div>

          <ProductDetailsClient product={product} platform="manasik" />
        </Container>
        <Testimonials />
        <Container>
          <FAQDisplay />
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
