import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getStaticPageText } from '@/lib/static-pages';
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
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('documentation', locale),
  ]);

  return getSeoMetadata({
    locale,
    path: PATH,
    title: `${db.title ?? t('pageTitle')} | ${brandName(locale)}`,
    description: db.description ?? t('pageDescription'),
  });
}

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: NS }),
    getStaticPageText('documentation', locale),
  ]);
  const items = db.items ?? (t.raw('sections') as { h: string; p: string }[]);
  const pageTitle = db.title ?? t('pageTitle');
  const pageDescription = db.description ?? t('pageDescription');

  return (
    <TrustPage
      locale={locale}
      path={PATH}
      title={pageTitle}
      description={pageDescription}
      items={items}
    />
  );
}
