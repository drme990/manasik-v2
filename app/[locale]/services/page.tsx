import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Breadcrumb from '@/components/seo/breadcrumb';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ServiceCard from '@/components/seo/service-card';
import { buildBreadcrumbSchema, pageMetadata } from '@/lib/seo';
import { getSeoServices, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'services', '/services');
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, services] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.services' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoServices(),
  ]);

  const active = services
    .filter((s) => s.isActive && pick(s.name, locale))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('pageTitle'),
    url: `${SITE_URL}/${locale}/services`,
    numberOfItems: active.length,
    itemListElement: active.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pick(s.name, locale),
      url: `${SITE_URL}/${locale}/services/${s.slug}`,
    })),
  };

  return (
    <>
      {active.length > 0 && <JsonLd data={itemListJsonLd} />}
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/services' },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]} />
        <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

        {active.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </PageShell>
    </>
  );
}
