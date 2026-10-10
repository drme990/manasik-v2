import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeasonalPages, pick } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.seasonal' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/seasonal',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function SeasonalPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.seasonal');
  const tc = await getTranslations('seoPages.common');

  const pages = (await getSeasonalPages())
    .filter((p) => p.isActive)
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

          {pages.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pages.map((page) => (
                <Link
                  key={page._id}
                  href={`/seasonal/${page.slug}`}
                  className="group bg-card-bg border border-stroke rounded-site p-6 hover:border-success transition-colors"
                >
                  <h2 className="text-xl font-bold text-foreground group-hover:text-success transition-colors mb-2">
                    {pick(page.name, locale)}
                  </h2>
                  {pick(page.seasonNote, locale) && (
                    <span className="text-xs text-success font-medium">
                      {pick(page.seasonNote, locale)}
                    </span>
                  )}
                  <p className="text-secondary text-sm leading-relaxed line-clamp-3 mt-2">
                    {pick(page.description, locale)}
                  </p>
                  <span className="text-success text-sm font-medium mt-3 inline-block">
                    {tc('learnMore')} {locale === 'ar' ? '←' : '→'}
                  </span>
                </Link>
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
