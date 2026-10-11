import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CreditCard, Tag } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ServiceContent from '@/components/seo/service-content';
import {
  buildBreadcrumbSchema,
  buildServiceSchema,
  countryName,
  getSeoMetadata,
  withBrand,
} from '@/lib/seo';
import {
  getSeoService,
  pick,
  resolveCountryHub,
} from '@/lib/seo-content';
import type { SeoFaq } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string; serviceSlug: string }>;
}): Promise<Metadata> {
  const { locale, countryCode, serviceSlug } = await params;
  const [hub, service] = await Promise.all([
    resolveCountryHub(countryCode),
    getSeoService(serviceSlug),
  ]);
  if (
    !hub ||
    !service ||
    !service.isActive ||
    !hub.serviceSlugs.includes(service.slug) ||
    !pick(service.name, locale)
  ) {
    notFound();
  }
  if (countryCode !== hub.slug) {
    permanentRedirect(`/${locale}/countries/${hub.slug}/${service.slug}`);
  }

  const heading = `${pick(service.name, locale)} — ${countryName(hub.countryCode, locale)}`;
  const title = withBrand(heading, locale);

  return getSeoMetadata({
    locale,
    path: `/countries/${hub.slug}/${service.slug}`,
    title,
    description: pick(service.description, locale),
    keywords: service.keywords?.[locale as 'ar' | 'en'],
    openGraph: service.ogImage
      ? { images: [{ url: service.ogImage, alt: heading }] }
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
    resolveCountryHub(countryCode),
    getSeoService(serviceSlug),
  ]);
  if (
    !hub ||
    !service ||
    !service.isActive ||
    !hub.serviceSlugs.includes(service.slug) ||
    !pick(service.name, locale)
  ) {
    notFound();
  }
  if (countryCode !== hub.slug) {
    permanentRedirect(`/${locale}/countries/${hub.slug}/${service.slug}`);
  }

  const [t, tc, ts] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.countries' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getTranslations({ locale, namespace: 'seoPages.serviceDetail' }),
  ]);

  const cName = countryName(hub.countryCode, locale);
  const serviceName = pick(service.name, locale);
  const description = pick(service.description, locale);
  const h1 = `${serviceName} — ${cName}`;
  const paymentMethods = pick(hub.paymentMethods, locale);
  const pricingNote = pick(hub.pricingNote, locale);
  const ctaText = pick(service.ctaText, locale) || ts('orderNow');
  const ctaLink = pick(service.ctaLink, locale) || '/products';
  // Service FAQs first, then the hub's country-specific ones — one FAQ block.
  const faqs: SeoFaq[] = [...(service.faqs || []), ...(hub.faqs || [])];
  const path = `/countries/${hub.slug}/${service.slug}`;

  return (
    <>
      <JsonLd
        data={buildServiceSchema(locale, service, SITE_URL, {
          name: h1,
          url: `${SITE_URL}/${locale}${path}`,
          areaServed: { '@type': 'Country', name: cName },
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
            { name: cName, path: `/countries/${hub.slug}` },
            { name: serviceName, path },
          ],
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/countries' },
            { label: cName, href: `/countries/${hub.slug}` },
            { label: serviceName },
          ]}
        />

        <PageHeader
          title={h1}
          description={description}
          eyebrow={cName}
          align="start"
        />

        {(paymentMethods || pricingNote) && (
          <section className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            {paymentMethods && (
              <div className="rounded-site border border-success/30 bg-success/5 p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-foreground">
                  <CreditCard size={20} aria-hidden="true" className="text-success" />
                  {t('paymentMethods')}
                </h2>
                <HtmlContent html={paymentMethods} className="text-sm text-secondary" />
              </div>
            )}
            {pricingNote && (
              <div className="rounded-site border border-success/30 bg-success/5 p-6">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-foreground">
                  <Tag size={20} aria-hidden="true" className="text-success" />
                  {t('pricingNote')}
                </h2>
                <HtmlContent html={pricingNote} className="text-sm text-secondary" />
              </div>
            )}
          </section>
        )}

        <ServiceContent service={service} locale={locale} />

        <FaqSection faqs={faqs} locale={locale} heading={ts('faqs')} />

        <CtaBlock
          title={h1}
          subtitle={description}
          ctaLabel={ctaText}
          ctaHref={ctaLink}
        />
      </PageShell>
    </>
  );
}
