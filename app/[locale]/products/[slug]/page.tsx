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
import { getTranslations } from 'next-intl/server';
import { HandHeart, ShoppingBag } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import LinkTile from '@/components/seo/link-tile';
import { getLinkedProducts, getServiceForProduct, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';
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

  if (!product) notFound();

  const productName = product.name[locale as 'ar' | 'en'] || product.name.ar;
  const productDescription =
    product.content?.[locale as 'ar' | 'en']
      ?.replace(/<[^>]*>/g, '')
      .replace(/^\s*(description|الوصف)\s*:\s*/i, '')
      .slice(0, 160)
      .trim() || productName;
  // Read base price from resolvedPrices (first entry)
  const firstSize = product.sizes?.[0];
  const basePriceForSeo = firstSize?.resolvedPrices?.[0]?.amount ?? 0;
  const baseCurrencyForSeo = firstSize?.resolvedPrices?.[0]?.currencyCode || product.baseCurrency;
  const productPrice = `${basePriceForSeo} ${baseCurrencyForSeo}`;
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
      images: primaryImage ? [{ url: primaryImage, alt: productName }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} | ${brandName}`,
      description: productDescription,
      images: primaryImage ? [{ url: primaryImage, alt: productName }] : [],
    },
  });
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
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
  const baseUrl = SITE_URL;
  const productName = product.name[locale as 'ar' | 'en'] || product.name.ar;
  const [tc, tp, parentService] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getTranslations({ locale, namespace: 'seoPages.productDetail' }),
    getServiceForProduct(product.slug),
  ]);
  const siblings = parentService
    ? (await getLinkedProducts(parentService.linkedProductSlugs)).filter(
      (p) => p.slug !== product.slug && pick(p.name, locale),
    )
    : [];

  const productJsonLd = buildProductSchema(locale, product, baseUrl, primaryImage);

  const breadcrumbJsonLd = buildBreadcrumbSchema(locale, [
    { name: tc('home'), path: '/' },
    { name: tc('products'), path: '/products' },
    { name: productName, path: `/products/${canonicalPath}` },
  ], baseUrl);

  // Shared event id for this page view — passed to the client
  // component too so the browser-side ViewContent deduplicates
  // against this server-side one instead of double-counting.
  const viewEventId = crypto.randomUUID();

  trackViewContent({
    productId: product._id,
    productName: product.name.en || product.name.ar,
    value: lowestPrice,
    currency: lowestPriceCurrency,
    sourceUrl: `${baseUrl}/${locale}/products/${canonicalPath}`,
    userData: { client_ip_address: ip, client_user_agent: ua },
    eventId: viewEventId,
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
          <div className="flex items-center gap-4 pt-8 mb-8">
            <BackButton />
            <div className="min-w-0 [&_nav]:mb-0">
              <Breadcrumb
                items={[
                  { label: tc('home'), href: '/' },
                  { label: tc('products'), href: '/products' },
                  { label: productName },
                ]}
              />
            </div>
          </div>

          <ProductDetailsClient product={product} platform="manasik" viewEventId={viewEventId} />

          {parentService && pick(parentService.name, locale) && (
            <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <h2 className="mb-4 text-xl font-bold text-foreground">
                  {tp('partOfService')}
                </h2>
                <LinkTile
                  href={`/services/${parentService.slug}`}
                  label={pick(parentService.name, locale)}
                  description={pick(parentService.description, locale)}
                  icon={<HandHeart size={20} aria-hidden="true" />}
                />
              </div>
              {siblings.length > 0 && (
                <div className="lg:col-span-2">
                  <h2 className="mb-4 text-xl font-bold text-foreground">
                    {tp('relatedProducts')}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {siblings.slice(0, 6).map((p) => (
                      <LinkTile
                        key={p.slug}
                        href={`/products/${p.slug}`}
                        label={pick(p.name, locale)}
                        icon={<ShoppingBag size={20} aria-hidden="true" />}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
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
