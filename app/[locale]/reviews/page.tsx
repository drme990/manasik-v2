import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ShoppingBag, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import ReviewsSection from '@/components/seo/reviews-section';
import ReviewsTabs from '@/components/seo/reviews-tabs';
import { buildBreadcrumbSchema, pageMetadata, withSectionIndexing } from '@/lib/seo';
import { getSeoReviews, getSharedMedia } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';
import { getStaticPageText } from '@/lib/static-pages';
import ShareExperienceButton from '@/components/experience/share-experience-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [meta, items] = await Promise.all([
    pageMetadata(locale, 'reviews', '/reviews'),
    getSeoReviews(undefined, { all: true }),
  ]);
  return withSectionIndexing(meta, items.some((r) => r.isActive));
}

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Every published review, voice and video here, by kind; elsewhere only the featured ones (owner, 2026-10-13).
  const [t, tc, ts, all, audio, video] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.reviews' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getTranslations({ locale, namespace: 'shareExperience' }),
    getSeoReviews(undefined, { all: true }),
    getSharedMedia('audio'),
    getSharedMedia('video'),
  ]);
  // Title and intro editable from the dashboard (owner, 2026-10-12).
  const db = await getStaticPageText('reviews', locale);
  const pageTitle = db.title ?? t('pageTitle');
  const pageDescription = db.description ?? t('pageDescription');

  const reviews = all.filter((r) => r.isActive);
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
            { name: pageTitle, path: '/reviews' },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: pageTitle }]} />
        <PageHeader title={pageTitle} description={pageDescription}>
          {reviews.length > 0 && (
            <div className="mx-auto mt-6 inline-flex items-center gap-4 rounded-site border border-stroke bg-card-bg px-6 py-4">
              <span className="text-4xl font-bold text-foreground">
                {average.toFixed(1)}
              </span>
              <span className="text-start">
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={
                        i < Math.round(average)
                          ? 'fill-warning text-warning'
                          : 'text-stroke/40'
                      }
                    />
                  ))}
                </span>
                <span className="mt-1 block text-sm text-secondary">
                  {t('reviewsCount', { count: reviews.length })}
                </span>
              </span>
            </div>
          )}
          {/* «شارك تجربتك» and, beside it, the products (owner, 2026-10-13). */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <ShareExperienceButton />
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-site border border-stroke px-6 text-base font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              <ShoppingBag size={19} aria-hidden />
              {t('browseProducts')}
            </Link>
          </div>
        </PageHeader>

        {reviews.length + audio.length + video.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <ReviewsTabs
            written={
              <ReviewsSection
                reviews={reviews}
                locale={locale}
                verifiedLabel={t('verified')}
                purchaseLabel={ts('verifiedPurchase')}
              />
            }
            audio={audio}
            video={video}
            labels={{
              text: t('tabText'),
              audio: t('tabAudio'),
              video: t('tabVideo'),
              purchase: ts('verifiedPurchase'),
              counts: { text: reviews.length, audio: audio.length, video: video.length },
            }}
          />
        )}

        <CtaBlock
          title={tc('ctaTitle')}
          subtitle={tc('ctaSubtitle')}
          ctaLabel={tc('browseServices')}
          ctaHref="/services"
        />
      </PageShell>
    </>
  );
}
