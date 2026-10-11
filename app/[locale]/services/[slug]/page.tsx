import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ShoppingBag } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import JsonLd from '@/components/seo/json-ld';
import LinkTile from '@/components/seo/link-tile';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ReviewsSection from '@/components/seo/reviews-section';
import ServiceContent from '@/components/seo/service-content';
import {
  buildBreadcrumbSchema,
  buildServiceSchema,
  getSeoMetadata,
  settingsAreaServed,
  withBrand,
} from '@/lib/seo';
import {
  getLinkedProducts,
  getSeoReviews,
  getSeoService,
  getSeoSettings,
  pick,
} from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await getSeoService(slug);
  if (!service || !service.isActive || !pick(service.name, locale)) notFound();

  const title = withBrand(
    pick(service.title, locale) || pick(service.name, locale),
    locale,
  );

  return getSeoMetadata({
    locale,
    path: `/services/${service.slug}`,
    title,
    description: pick(service.description, locale),
    keywords: service.keywords?.[locale as 'ar' | 'en'],
    openGraph: service.ogImage || service.heroImage
      ? { images: [{ url: service.ogImage || service.heroImage!, alt: title }] }
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
  if (!service || !service.isActive || !pick(service.name, locale)) notFound();

  const [t, tc, ts, reviews, linkedProducts, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.services' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getTranslations({ locale, namespace: 'seoPages.serviceDetail' }),
    getSeoReviews(service.slug),
    getLinkedProducts(service.linkedProductSlugs || []),
    getSeoSettings(),
  ]);
  const activeReviews = reviews.filter((r) => r.isActive);

  const name = pick(service.name, locale);
  const description = pick(service.description, locale);
  const ctaText = pick(service.ctaText, locale) || ts('orderNow');
  const ctaLink = pick(service.ctaLink, locale) || '/products';

  return (
    <>
      <JsonLd
        data={buildServiceSchema(locale, service, SITE_URL, {
          areaServed: settingsAreaServed(settings),
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/services' },
            { name, path: `/services/${service.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/services' },
            { label: name },
          ]}
        />

        <PageHeader title={name} description={description} align="start" />

        {service.heroImage && (
          <div className="relative mb-10 aspect-16/7 w-full overflow-hidden rounded-site border border-stroke">
            <Image
              src={service.heroImage}
              alt={name}
              fill
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        )}

        <ServiceContent service={service} locale={locale} />

        {linkedProducts.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              {ts('relatedProducts')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {linkedProducts.map((product) => (
                <LinkTile
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  label={pick(product.name, locale)}
                  icon={<ShoppingBag size={20} aria-hidden="true" />}
                />
              ))}
            </div>
          </section>
        )}

        <FaqSection faqs={service.faqs} locale={locale} heading={ts('faqs')} />

        <ReviewsSection
          reviews={activeReviews}
          locale={locale}
          heading={ts('reviews')}
          verifiedLabel={ts('verified')}
        />

        <CtaBlock
          title={name}
          subtitle={description}
          ctaLabel={ctaText}
          ctaHref={ctaLink}
        />
      </PageShell>
    </>
  );
}
