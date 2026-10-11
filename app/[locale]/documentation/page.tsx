import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import TrustPage from '@/components/seo/trust-page';
import { brandName, getSeoMetadata } from '@/lib/seo';

const NS = 'seoPages.documentation';
const PATH = '/documentation';

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

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: NS });
  const items = t.raw('sections') as { h: string; p: string }[];

  return (
    <TrustPage
      locale={locale}
      path={PATH}
      title={t('pageTitle')}
      description={t('pageDescription')}
      items={items}
    />
  );
}
