import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import ReviewsSection from '@/components/seo/reviews-section';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoReviews } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.reviews' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/reviews',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function ReviewsPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.reviews');
  const tc = await getTranslations('seoPages.common');

  const reviews = (await getSeoReviews()).filter((r) => r.isActive);

  const average = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/reviews' },
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
            {reviews.length > 0 && (
              <p className="mt-4 text-lg">
                <span className="text-warning text-2xl align-middle">
                  {'★'.repeat(Math.round(average))}
                </span>{' '}
                <span className="font-bold text-foreground">
                  {average.toFixed(1)}
                </span>{' '}
                <span className="text-secondary">
                  / 5 · {reviews.length} {t('reviewsCount')}
                </span>
              </p>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            <ReviewsSection
              reviews={reviews}
              locale={locale}
              heading={t('allReviews')}
              verifiedLabel={t('verified')}
            />
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
