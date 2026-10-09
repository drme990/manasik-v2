import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import ServiceCard from '@/components/seo/service-card';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoServices, pick } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.services' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/services',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function ServicesPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.services');
  const tc = await getTranslations('seoPages.common');
  const isAr = locale === 'ar';

  const services = await getSeoServices();
  const active = services
    .filter((s) => s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('pageTitle'),
    url: `${BASE_URL}/${locale}/services`,
    numberOfItems: active.length,
    itemListElement: active.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pick(s.name, locale),
      url: `${BASE_URL}/${locale}/services/${s.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/services' },
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
              { label: t('pageTitle') },
            ]}
          />
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {t('pageTitle')}
            </h1>
            <p className="text-secondary max-w-2xl mx-auto">
              {t('pageDescription')}
            </p>
          </div>

          {active.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {active.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  locale={locale}
                  ctaLabel={tc('learnMore')}
                />
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
