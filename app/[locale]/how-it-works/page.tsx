import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getStaticPageText } from '@/lib/static-pages';
import TrustPage from '@/components/seo/trust-page';
import { brandName, getSeoMetadata } from '@/lib/seo';

const NS = 'seoPages.howItWorks';
const PATH = '/how-it-works';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('howItWorks', locale),
  ]);

  return getSeoMetadata({
    locale,
    path: PATH,
    title: `${db.title ?? t('pageTitle')} | ${brandName(locale)}`,
    description: db.description ?? t('pageDescription'),
  });
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('howItWorks', locale),
  ]);
  const items = db.items ?? (t.raw('steps') as { h: string; p: string }[]);
  const pageTitle = db.title ?? t('pageTitle');
  const pageDescription = db.description ?? t('pageDescription');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: pageTitle,
    description: pageDescription,
    step: items.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.h,
      text: s.p,
    })),
  };

  return (
    <TrustPage
      locale={locale}
      path={PATH}
      title={pageTitle}
      description={pageDescription}
      items={items}
      numbered
      jsonLd={jsonLd}
    />
  );
}
