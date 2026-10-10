import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import ServiceContent from '@/components/seo/service-content';
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildServiceSchema,
  getSeoMetadata,
} from '@/lib/seo';
import {
  getSeoCountries,
  getSeoService,
  getSeoServices,
  pick,
} from '@/lib/seo-content';
import type { SeoCountryHub, SeoFaq } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

async function resolveCountry(param: string): Promise<SeoCountryHub | null> {
  const hubs = await getSeoCountries();
  const needle = param.toLowerCase();
  return (
    hubs.find(
      (h) =>
        h.isActive &&
        (h.slug === needle || h.countryCode.toLowerCase() === needle),
    ) || null
  );
}

function countryName(code: string, locale: string): string {
  try {
    const names = new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], {
      type: 'region',
    });
    return names.of(code) || code;
  } catch {
    return code;
  }
}

export async function generateStaticParams() {
  const [hubs, services] = await Promise.all([
    getSeoCountries(),
    getSeoServices(),
  ]);
  const activeSlugs = new Set(
    services.filter((s) => s.isActive).map((s) => s.slug),
  );
  return hubs
    .filter((h) => h.isActive)
    .flatMap((h) =>
      (h.serviceSlugs || [])
        .filter((slug) => activeSlugs.has(slug))
        .map((serviceSlug) => ({
          countryCode: h.slug,
          serviceSlug,
        })),
    );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string; serviceSlug: string }>;
}): Promise<Metadata> {
  const { locale, countryCode, serviceSlug } = await params;
  const [hub, service] = await Promise.all([
    resolveCountry(countryCode),
    getSeoService(serviceSlug),
  ]);
  if (!hub || !service || !hub.serviceSlugs.includes(service.slug)) return {};

  const name = `${pick(service.name, locale)} — ${countryName(hub.countryCode, locale)}`;
  const description = pick(service.description, locale);

  return getSeoMetadata({
    locale,
    path: `/countries/${hub.slug}/${service.slug}`,
    title: name,
    description,
    keywords: service.keywords?.[locale as 'ar' | 'en'] || service.keywords?.ar,
    openGraph: service.ogImage
      ? { images: [{ url: service.ogImage, alt: name }] }
      : undefined,
  });
}

export default async function CountryServicePage({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string; serviceSlug: string }>;
}) {
  const { locale, countryCode, serviceSlug } = await params;
  const [hub, service] = await Promise.all([
    resolveCountry(countryCode),
    getSeoService(serviceSlug),
  ]);
  if (
    !hub ||
    !service ||
    !service.isActive ||
    !hub.serviceSlugs.includes(service.slug)
  ) {
    notFound();
  }

  const [t, tc, ts] = await Promise.all([
    getTranslations('seoPages.countries'),
    getTranslations('seoPages.common'),
    getTranslations('seoPages.serviceDetail'),
  ]);

  const cName = countryName(hub.countryCode, locale);
  const serviceName = pick(service.name, locale);
  const h1 = `${serviceName} — ${cName}`;
  const hubTitle = pick(hub.title, locale);
  const paymentMethods = pick(hub.paymentMethods, locale);
  const pricingNote = pick(hub.pricingNote, locale);
  const ctaText = pick(service.ctaText, locale) || tc('learnMore');
  const ctaLink = pick(service.ctaLink, locale) || '/products';

  const faqs: SeoFaq[] = [...(service.faqs || []), ...(hub.faqs || [])];
  const localizedFaqs = faqs.map((f) => ({
    question: pick(f.question, locale),
    answer: pick(f.answer, locale).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  }));

  const serviceSchema = {
    ...buildServiceSchema(locale, service, BASE_URL),
    name: h1,
    url: `${BASE_URL}/${locale}/countries/${hub.slug}/${service.slug}`,
    areaServed: { '@type': 'Country', name: hub.countryCode },
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
            { name: hubTitle, path: `/countries/${hub.slug}` },
            {
              name: serviceName,
              path: `/countries/${hub.slug}/${service.slug}`,
            },
          ],
          BASE_URL,
        )}
      />
      {localizedFaqs.length > 0 && (
        <JsonLd data={buildFaqSchema(localizedFaqs)} />
      )}
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <Breadcrumb
            items={[
              { label: tc('home'), href: '/' },
              { label: t('pageTitle'), href: '/countries' },
              { label: hubTitle, href: `/countries/${hub.slug}` },
              { label: serviceName },
            ]}
          />

          <h1 className="text-4xl font-bold text-foreground mb-8">{h1}</h1>

          <ServiceContent
            service={service}
            locale={locale}
            labels={{
              whoIsItFor: ts('whoIsItFor'),
              shariaConditions: ts('shariaConditions'),
              process: ts('process'),
              documentation: ts('documentation'),
              timeline: ts('timeline'),
              pricing: ts('pricing'),
              whyChooseUs: ts('whyChooseUs'),
            }}
          />

          {(paymentMethods || pricingNote) && (
            <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentMethods && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {t('paymentMethods')}
                  </h2>
                  <HtmlContent html={paymentMethods} />
                </div>
              )}
              {pricingNote && (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {t('pricingNote')}
                  </h2>
                  <HtmlContent html={pricingNote} />
                </div>
              )}
            </section>
          )}

          <FaqSection
            faqs={faqs}
            locale={locale}
            heading={ts('faqs')}
          />

          <CtaBlock
            title={h1}
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
