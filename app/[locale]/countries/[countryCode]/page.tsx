import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
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
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoCountries, getSeoServices, pick } from '@/lib/seo-content';
import type { SeoCountryHub } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

// The route param accepts the hub slug or the ISO country code.
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

export async function generateStaticParams() {
  const hubs = await getSeoCountries();
  return hubs
    .filter((h) => h.isActive)
    .map((h) => ({ countryCode: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>;
}): Promise<Metadata> {
  const { locale, countryCode } = await params;
  const hub = await resolveCountry(countryCode);
  if (!hub) return {};

  return getSeoMetadata({
    locale,
    path: `/countries/${hub.slug}`,
    title: pick(hub.title, locale),
    description: pick(hub.description, locale),
    keywords: hub.keywords?.[locale as 'ar' | 'en'] || hub.keywords?.ar,
    openGraph: hub.ogImage
      ? { images: [{ url: hub.ogImage, alt: pick(hub.title, locale) }] }
      : undefined,
  });
}

export default async function CountryHubPage({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>;
}) {
  const { locale, countryCode } = await params;
  const hub = await resolveCountry(countryCode);
  if (!hub) notFound();

  const [t, tc] = await Promise.all([
    getTranslations('seoPages.countries'),
    getTranslations('seoPages.common'),
  ]);

  const services = (await getSeoServices()).filter(
    (s) => s.isActive && hub.serviceSlugs.includes(s.slug),
  );

  const title = pick(hub.title, locale);
  const intro = pick(hub.intro, locale);
  const paymentMethods = pick(hub.paymentMethods, locale);
  const pricingNote = pick(hub.pricingNote, locale);
  const ctaText = pick(hub.ctaText, locale) || tc('learnMore');
  const isAr = locale === 'ar';

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
          url: `${BASE_URL}/${locale}/countries/${hub.slug}`,
          areaServed: {
            '@type': 'Country',
            name: hub.countryCode,
          },
          provider: {
            '@type': 'Organization',
            name: isAr ? 'مؤسسة مناسك' : 'Manasik Foundation',
            url: BASE_URL,
          },
        }}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
            { name: title, path: `/countries/${hub.slug}` },
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
              { label: t('pageTitle'), href: '/countries' },
              { label: title },
            ]}
          />

          <h1 className="text-4xl font-bold text-foreground mb-6">{title}</h1>
          {intro && (
            <HtmlContent html={intro} className="text-lg text-secondary" />
          )}

          {services.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-foreground mb-5">
                {t('servicesInCountry')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/countries/${hub.slug}/${service.slug}`}
                    className="bg-card-bg border border-stroke rounded-site p-4 hover:border-success transition-colors"
                  >
                    <span className="font-semibold text-foreground">
                      {pick(service.name, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

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

          {hub.testimonials && hub.testimonials.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-foreground mb-5">
                {t('testimonials')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hub.testimonials.map((tst, i) => (
                  <div
                    key={i}
                    className="bg-card-bg border border-stroke rounded-site p-5"
                  >
                    <p className="text-secondary text-sm leading-relaxed mb-3">
                      {pick(tst.text, locale)}
                    </p>
                    <span className="text-foreground font-semibold text-sm">
                      {tst.name}
                    </span>
                    {tst.date && (
                      <span className="text-secondary text-xs ms-2">
                        {tst.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <FaqSection
            faqs={hub.faqs || []}
            locale={locale}
            heading={tc('faqs')}
          />

          <CtaBlock
            title={title}
            ctaLabel={ctaText}
            ctaHref="/services"
          />
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
