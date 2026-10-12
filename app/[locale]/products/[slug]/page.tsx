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
import {
  getSeoMetadata,
  buildProductSchema,
  buildBreadcrumbSchema,
  buildWebPageSchema,
  productSeoTitle,
  seoDescriptionFromHtml,
} from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { HandHeart, ShoppingBag } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import LinkTile from '@/components/seo/link-tile';
import { getLinkedProducts, getSeoReviews, getServiceForProduct, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';
import { trackViewContent } from '@/lib/fb-capi';
import { getViewerCountryCode } from '@/lib/viewer-country';
import ProductDetailsClient from './product-details-client';
import { getSiteSwitch, withoutPrices } from '@/lib/site-switches';
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
  // SEO (owner, 2026-10-12): no price anywhere in the metadata — prices are
  // shown only after the visitor's country is known; the description is the
  // first readable sentences of the product text, cut at a word boundary.
  const productDescription = seoDescriptionFromHtml(
    product.content?.[locale as 'ar' | 'en'],
    productName,
  );
  const primaryImage = getPrimaryProductImageUrl(product);
  const isAr = locale === 'ar';
  const brandName = isAr ? 'مناسك' : 'Manasik';
  const seoTitle = productSeoTitle(productName, slug, locale);

  return getSeoMetadata({
    locale,
    path: `/products/${slug}`,
    title: seoTitle,
    description: productDescription,
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
      title: seoTitle,
      description: productDescription,
      siteName: brandName,
      type: 'website',
      images: primaryImage ? [{ url: primaryImage, alt: productName }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: productDescription,
      images: primaryImage ? [{ url: primaryImage, alt: productName }] : [],
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
  // Asked for alongside the product so the page is not held back by it.
  const pricesDeferredPromise = getSiteSwitch('hide-prices-in-page-code');
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
  // Switch «الأسعار مش بتتبعت في كود صفحة المنتج» (restore points page, owner 2026-10-12):
  // on = the page goes out with no price in it and the browser asks for the prices once the
  // visitor's country is confirmed; off = exactly as before. The server keeps the prices it
  // fetched for its own Meta event above either way.
  const pricesDeferred = await pricesDeferredPromise;
  const clientProduct = pricesDeferred ? withoutPrices(product) : product;
  const webPageJsonLd = buildWebPageSchema(locale, {
    url: `${baseUrl}/${locale}/products/${canonicalPath}`,
    name: productSeoTitle(productName, product.slug, locale),
    dateModified: product.updatedAt,
  }, baseUrl);

  const breadcrumbJsonLd = buildBreadcrumbSchema(locale, [
    { name: tc('home'), path: '/' },
    { name: tc('products'), path: '/products' },
    { name: productName, path: `/products/${canonicalPath}` },
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
      sourceUrl: `${baseUrl}/${locale}/products/${canonicalPath}`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd).replace(/</g, '\\u003c'),
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

          <ProductDetailsClient product={clientProduct} platform="manasik" viewEventId={viewEventId} pricesDeferred={pricesDeferred} />

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
        {/* The dashboard's reviews, same section as the homepage (owner, 2026-10-12). */}
        <Testimonials reviews={await getSeoReviews()} />
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
