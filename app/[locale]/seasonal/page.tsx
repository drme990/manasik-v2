import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Moon } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import ContentCard from '@/components/seo/content-card';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { buildBreadcrumbSchema, pageMetadata } from '@/lib/seo';
import { getSeasonalPages, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'seasonal', '/seasonal');
}

export default async function SeasonalIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, all] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.seasonal' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeasonalPages(),
  ]);

  const pages = all
    .filter((p) => p.isActive && pick(p.name, locale))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/seasonal' },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]} />
        <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

        {pages.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <ContentCard
                key={page._id}
                href={`/seasonal/${page.slug}`}
                title={pick(page.name, locale)}
                description={pick(page.description, locale)}
                eyebrow={pick(page.seasonNote, locale) || undefined}
                image={page.heroImage || page.ogImage}
                fallback={<Moon size={44} strokeWidth={1.5} aria-hidden="true" />}
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
