import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
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
  const viewerCountryCode = await getViewerCountryCode();
  const product = await getProduct(slug, viewerCountryCode);

  if (!product) {
    return {
      title: { absolute: locale === 'ar' ? 'المنتج غير موجود | مناسك' : 'Product Not Found | Manasik' },
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
  const baseCurrencyForSeo = firstSize?.resolvedPrices?.[0]?.currencyCode || product.baseCurrency;
  const productPrice = `${basePriceForSeo} ${baseCurrencyForSeo}`;
  const primaryImage = getPrimaryProductImageUrl(product);
  const isAr = locale === 'ar';
  const brandName = isAr ? 'مناسك' : 'Manasik';

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

/** Meta's click id in its own format, when the pixel has not written the `_fbc` cookie yet (first page from an ad). */
function fbcFromClickId(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

export default async function ProductDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const viewerCountryCode = await getViewerCountryCode();
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
  const lowestPriceCurrency = product.sizes?.[0]?.resolvedPrices?.[0]?.currencyCode || product.baseCurrency || 'SAR';
  const canonicalPath = product.slug;
  const primaryImage = getPrimaryProductImageUrl(product);
  const baseUrl = (process.env.BASE_URL || 'https://www.manasik.net').replace(/\/$/, '');

  const productJsonLd = buildProductSchema(locale, product, baseUrl, primaryImage);

  const breadcrumbJsonLd = buildBreadcrumbSchema(locale, [
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', path: '/' },
    { name: locale === 'ar' ? 'المنتجات' : 'Products', path: '/products' },
    { name: product.name[locale as 'ar' | 'en'] || product.name.ar, path: `/products/${canonicalPath}` },
  ], baseUrl);

  // Shared event id for this page view — passed to the client
  // component too so the browser-side ViewContent deduplicates
  // against this server-side one instead of double-counting.
  const viewEventId = crypto.randomUUID();

  // Sent from here only when the visitor can be identified (owner, 2026-10-10 — Meta flagged server events that carry
  // nothing but the address and browser: s2s_missing_pii_or_external_id_actions). On the very first page of a visit
  // there are no cookies yet; then the browser's own copy of this event (same id, product-details-client.tsx), which
  // carries the visitor's keys, is the one Meta gets.
  const jar = await cookies();
  const query = await searchParams;
  const fbclid = typeof query.fbclid === 'string' ? query.fbclid : undefined;
  const fbc = jar.get('_fbc')?.value || (fbclid ? fbcFromClickId(fbclid) : undefined);
  const fbp = jar.get('_fbp')?.value;
  const visitorId = jar.get('mvid')?.value;
  if (fbc || fbp || visitorId) {
    trackViewContent({
      productId: product._id,
      productName: product.name.en || product.name.ar,
      value: lowestPrice,
      currency: lowestPriceCurrency,
      sourceUrl: `https://www.manasik.net/products/${canonicalPath}`,
      userData: {
        client_ip_address: ip,
        client_user_agent: ua,
        ...(fbc ? { fbc } : {}),
        ...(fbp ? { fbp } : {}),
        ...(visitorId ? { external_id: visitorId } : {}),
      },
      eventId: viewEventId,
    }).catch(() => { });
  }

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

          <ProductDetailsClient product={product} platform="manasik" viewEventId={viewEventId} />
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
