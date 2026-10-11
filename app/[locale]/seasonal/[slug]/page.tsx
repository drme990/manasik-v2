import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CalendarHeart } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ServiceCard from '@/components/seo/service-card';
import {
  buildBreadcrumbSchema,
  getSeoMetadata,
  withBrand,
} from '@/lib/seo';
import {
  getSeasonalPage,
  getSeoServices,
  pick,
} from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getSeasonalPage(slug);
  if (!page || !page.isActive || !pick(page.name, locale)) notFound();

  const title = withBrand(
    pick(page.title, locale) || pick(page.name, locale),
    locale,
  );
  const image = page.ogImage || page.heroImage;

  return getSeoMetadata({
    locale,
    path: `/seasonal/${page.slug}`,
    title,
    description: pick(page.description, locale),
    keywords: page.keywords?.[locale as 'ar' | 'en'],
    openGraph: image ? { images: [{ url: image, alt: title }] } : undefined,
  });
}

export default async function SeasonalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = await getSeasonalPage(slug);
  if (!page || !page.isActive || !pick(page.name, locale)) notFound();

  const [t, tc, allServices] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.seasonal' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoServices(),
  ]);

  const services = page.featuredServiceSlugs
    .map((s) => allServices.find((x) => x.slug === s && x.isActive))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && pick(s.name, locale)));

  const name = pick(page.name, locale);
  const description = pick(page.description, locale);
  const seasonNote = pick(page.seasonNote, locale);
  const intro = pick(page.intro, locale);
  const content = pick(page.content, locale);
  const ctaText = pick(page.ctaText, locale) || tc('browseServices');
  const ctaLink = pick(page.ctaLink, locale) || '/services';

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name,
          description,
          url: `${SITE_URL}/${locale}/seasonal/${page.slug}`,
          inLanguage: locale === 'ar' ? 'ar' : 'en',
          ...(page.heroImage || page.ogImage
            ? { primaryImageOfPage: page.heroImage || page.ogImage }
            : {}),
          isPartOf: { '@id': `${SITE_URL}/#website` },
        }}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/seasonal' },
            { name, path: `/seasonal/${page.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/seasonal' },
            { label: name },
          ]}
        />

        <PageHeader title={name} description={description} align="start">
          {seasonNote && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success">
              <CalendarHeart size={16} aria-hidden="true" />
              {seasonNote}
            </p>
          )}
        </PageHeader>

        {page.heroImage && (
          <div className="relative mb-10 aspect-16/6 w-full overflow-hidden rounded-site border border-stroke">
            <Image
              src={page.heroImage}
              alt={name}
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        )}

        {intro && (
          <div className="max-w-4xl">
            <HtmlContent html={intro} className="text-lg text-secondary" />
          </div>
        )}

        {services.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              {t('featuredServices')}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  locale={locale}
                  ctaLabel={tc('learnMore')}
                  as="h3"
                />
              ))}
            </div>
          </section>
        )}

        {content && (
          <section className="mt-14 max-w-4xl">
            <HtmlContent html={content} />
          </section>
        )}

        <div className="max-w-4xl">
          <FaqSection faqs={page.faqs} locale={locale} heading={tc('faqs')} />
        </div>

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
