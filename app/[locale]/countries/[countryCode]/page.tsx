import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CreditCard, Quote, Tag } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ServiceCard from '@/components/seo/service-card';
import {
  brandName,
  buildBreadcrumbSchema,
  countryName,
  getSeoMetadata,
  stripBrand,
  withBrand,
} from '@/lib/seo';
import {
  getSeoServices,
  pick,
  pickAny,
  resolveCountryHub,
} from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>;
}): Promise<Metadata> {
  const { locale, countryCode } = await params;
  const hub = await resolveCountryHub(countryCode);
  if (!hub || !pick(hub.title, locale)) notFound();
  // Resolve status codes in metadata too: crawlers get blocking metadata, so
  // they receive a real 308/404 even though the page body streams.
  if (countryCode !== hub.slug) permanentRedirect(`/${locale}/countries/${hub.slug}`);

  const title = withBrand(pick(hub.title, locale), locale);

  return getSeoMetadata({
    locale,
    path: `/countries/${hub.slug}`,
    title,
    description: pick(hub.description, locale),
    keywords: hub.keywords?.[locale as 'ar' | 'en'],
    openGraph: hub.ogImage
      ? { images: [{ url: hub.ogImage, alt: title }] }
      : undefined,
  });
}

export default async function CountryHubPage({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>;
}) {
  const { locale, countryCode } = await params;
  const hub = await resolveCountryHub(countryCode);
  if (!hub || !pick(hub.title, locale)) notFound();
  // ISO-code URLs (/countries/de) permanently redirect to the canonical slug.
  if (countryCode !== hub.slug) {
    permanentRedirect(`/${locale}/countries/${hub.slug}`);
  }

  const [t, tc, allServices] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.countries' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoServices(),
  ]);

  const services = hub.serviceSlugs
    .map((slug) => allServices.find((s) => s.slug === slug && s.isActive))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && pick(s.name, locale)));

  const title = stripBrand(pick(hub.title, locale));
  const description = pick(hub.description, locale);
  const intro = pick(hub.intro, locale);
  const paymentMethods = pick(hub.paymentMethods, locale);
  const pricingNote = pick(hub.pricingNote, locale);
  const ctaText = pick(hub.ctaText, locale) || tc('browseServices');
  const cName = countryName(hub.countryCode, locale);
  const testimonials = (hub.testimonials || [])
    .map((tst) => ({ ...tst, body: pickAny(tst.text, locale) }))
    .filter((tst) => tst.body);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: title,
          description,
          url: `${SITE_URL}/${locale}/countries/${hub.slug}`,
          areaServed: { '@type': 'Country', name: cName },
          provider: {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: brandName(locale),
            url: SITE_URL,
          },
          ...(services.length
            ? {
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: t('servicesInCountry'),
                itemListElement: services.map((s) => ({
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: pick(s.name, locale),
                    url: `${SITE_URL}/${locale}/countries/${hub.slug}/${s.slug}`,
                  },
                })),
              },
            }
            : {}),
        }}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
            { name: cName, path: `/countries/${hub.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/countries' },
            { label: cName },
          ]}
        />

        <PageHeader
          title={title}
          description={description}
          eyebrow={cName}
          align="start"
        />

        {intro && (
          <div className="max-w-4xl">
            <HtmlContent html={intro} className="text-lg text-secondary" />
          </div>
        )}

        {services.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              {t('servicesInCountry')}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  locale={locale}
                  ctaLabel={tc('learnMore')}
                  href={`/countries/${hub.slug}/${service.slug}`}
                  as="h3"
                />
              ))}
            </div>
          </section>
        )}

        {(paymentMethods || pricingNote) && (
          <section className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {paymentMethods && (
              <div className="rounded-site border border-stroke bg-card-bg p-6">
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                    <CreditCard size={20} aria-hidden="true" />
                  </span>
                  {t('paymentMethods')}
                </h2>
                <HtmlContent html={paymentMethods} className="text-secondary" />
              </div>
            )}
            {pricingNote && (
              <div className="rounded-site border border-stroke bg-card-bg p-6">
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                    <Tag size={20} aria-hidden="true" />
                  </span>
                  {t('pricingNote')}
                </h2>
                <HtmlContent html={pricingNote} className="text-secondary" />
              </div>
            )}
          </section>
        )}

        {testimonials.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              {t('testimonials')}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {testimonials.map((tst, i) => (
                <figure
                  key={i}
                  className="flex h-full flex-col gap-4 rounded-site border border-stroke bg-card-bg p-5"
                >
                  <Quote size={20} aria-hidden="true" className="text-success/40" />
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/80">
                    {tst.body}
                  </blockquote>
                  <figcaption className="flex items-center justify-between border-t border-stroke/30 pt-3 text-sm">
                    <span className="font-semibold text-foreground">{tst.name}</span>
                    {tst.date && (
                      <span className="text-xs text-secondary">{tst.date}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <FaqSection faqs={hub.faqs} locale={locale} heading={tc('faqs')} />

        <CtaBlock
          title={title}
          subtitle={description}
          ctaLabel={ctaText}
          ctaHref="/services"
        />
      </PageShell>
    </>
  );
}
