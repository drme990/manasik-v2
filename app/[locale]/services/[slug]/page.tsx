import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import JsonLd from '@/components/seo/json-ld';
import ReviewsSection from '@/components/seo/reviews-section';
import ServiceContent from '@/components/seo/service-content';
import {
  buildBreadcrumbSchema,
  buildServiceSchema,
  getSeoMetadata,
} from '@/lib/seo';
import {
  getSeoReviews,
  getSeoService,
  getSeoServices,
  pick,
} from '@/lib/seo-content';
import { Link } from '@/i18n/routing';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

type LinkedProduct = {
  slug: string;
  name: { ar: string; en: string };
  images?: { url: string }[];
};

async function fetchLinkedProducts(slugs: string[]): Promise<LinkedProduct[]> {
  if (!slugs.length) return [];
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/products?platform=manasik&limit=200`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const products: LinkedProduct[] = data.success
      ? data.data.products
      : [];
    const wanted = new Set(slugs);
    return products.filter((p) => p.slug && wanted.has(p.slug));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const services = await getSeoServices();
  return services
    .filter((s) => s.isActive)
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await getSeoService(slug);
  if (!service) return {};

  const title = pick(service.title, locale) || pick(service.name, locale);
  const description = pick(service.description, locale);
  const keywords =
    service.keywords?.[locale as 'ar' | 'en'] || service.keywords?.ar;

  return getSeoMetadata({
    locale,
    path: `/services/${service.slug}`,
    title,
    description,
    keywords,
    openGraph: service.ogImage
      ? { images: [{ url: service.ogImage, alt: title }] }
      : undefined,
  });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const service = await getSeoService(slug);
  if (!service || !service.isActive) notFound();

  const [t, tc, ts] = await Promise.all([
    getTranslations('seoPages.services'),
    getTranslations('seoPages.common'),
    getTranslations('seoPages.serviceDetail'),
  ]);

  const [reviews, linkedProducts] = await Promise.all([
    getSeoReviews(service.slug),
    fetchLinkedProducts(service.linkedProductSlugs || []),
  ]);
  const activeReviews = reviews.filter((r) => r.isActive);

  const name = pick(service.name, locale);
  const ctaText = pick(service.ctaText, locale) || tc('learnMore');
  const ctaLink = pick(service.ctaLink, locale) || '/products';

  return (
    <>
      <JsonLd data={buildServiceSchema(locale, service, BASE_URL)} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/services' },
            { name, path: `/services/${service.slug}` },
          ],
          BASE_URL,
        )}
      />
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <Breadcrumb
            items={[
              { label: tc('home'), href: '/' },
              { label: t('pageTitle'), href: '/services' },
              { label: name },
            ]}
          />

          {service.heroImage && (
            <div className="relative w-full h-64 md:h-80 rounded-site overflow-hidden mb-8">
              <Image
                src={service.heroImage}
                alt={name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <h1 className="text-4xl font-bold text-foreground mb-8">{name}</h1>

          <ServiceContent service={service} locale={locale} />

          {linkedProducts.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-foreground mb-5">
                {ts('relatedProducts')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkedProducts.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="bg-card-bg border border-stroke rounded-site p-4 hover:border-success transition-colors"
                  >
                    <span className="font-semibold text-foreground">
                      {pick(product.name, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <FaqSection
            faqs={service.faqs}
            locale={locale}
            heading={ts('faqs')}
          />

          <ReviewsSection
            reviews={activeReviews}
            locale={locale}
            heading={ts('reviews')}
            verifiedLabel={ts('verified')}
          />

          <CtaBlock
            title={name}
            ctaLabel={ctaText}
            ctaHref={ctaLink}
          />
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
