import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getStaticPageText } from '@/lib/static-pages';
import TrustPage from '@/components/seo/trust-page';
import { brandName, getSeoMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

const NS = 'seoPages.about';
const PATH = '/about';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('about', locale),
  ]);

  return getSeoMetadata({
    locale,
    path: PATH,
    title: `${db.title ?? t('pageTitle')} | ${brandName(locale)}`,
    description: db.description ?? t('pageDescription'),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('about', locale),
  ]);
  const items = db.items ?? (t.raw('sections') as { h: string; p: string }[]);
  const pageTitle = db.title ?? t('pageTitle');
  const pageDescription = db.description ?? t('pageDescription');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: pageTitle,
    description: pageDescription,
    url: `${SITE_URL}/${locale}${PATH}`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <TrustPage
      locale={locale}
      path={PATH}
      title={pageTitle}
      description={pageDescription}
      items={items}
      jsonLd={jsonLd}
    />
  );
}
