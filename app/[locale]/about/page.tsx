import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations({ locale, namespace: NS });

  return getSeoMetadata({
    locale,
    path: PATH,
    title: `${t('pageTitle')} | ${brandName(locale)}`,
    description: t('pageDescription'),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: NS });
  const items = t.raw('sections') as { h: string; p: string }[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: t('pageTitle'),
    description: t('pageDescription'),
    url: `${SITE_URL}/${locale}${PATH}`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <TrustPage
      locale={locale}
      path={PATH}
      title={t('pageTitle')}
      description={t('pageDescription')}
      items={items}
      jsonLd={jsonLd}
    />
  );
}
