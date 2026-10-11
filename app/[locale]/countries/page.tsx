import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Globe } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import ContentCard from '@/components/seo/content-card';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { buildBreadcrumbSchema, countryName, pageMetadata } from '@/lib/seo';
import { getSeoCountries, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'countries', '/countries');
}

export default async function CountriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, hubs] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.countries' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoCountries(),
  ]);

  const countries = hubs.filter((c) => c.isActive && pick(c.title, locale));

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]} />
        <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

        {countries.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <ContentCard
                key={country._id}
                href={`/countries/${country.slug}`}
                title={countryName(country.countryCode, locale)}
                description={pick(country.description, locale)}
                meta={
                  country.serviceSlugs?.length
                    ? t('servicesCount', { count: country.serviceSlugs.length })
                    : undefined
                }
                image={country.ogImage}
                fallback={
                  <span className="flex flex-col items-center gap-2" aria-hidden="true">
                    <Globe size={40} strokeWidth={1.5} />
                    <span className="text-2xl font-bold tracking-[0.3em]">
                      {country.countryCode.toUpperCase()}
                    </span>
                  </span>
                }
                ctaLabel={tc('learnMore')}
                as="h2"
              />
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
