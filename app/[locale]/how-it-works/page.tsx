import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations({ locale, namespace: NS });

  return getSeoMetadata({
    locale,
    path: PATH,
    title: `${t('pageTitle')} | ${brandName(locale)}`,
    description: t('pageDescription'),
  });
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: NS });
  const items = t.raw('steps') as { h: string; p: string }[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: t('pageTitle'),
    description: t('pageDescription'),
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
      title={t('pageTitle')}
      description={t('pageDescription')}
      items={items}
      numbered
      jsonLd={jsonLd}
    />
  );
}
