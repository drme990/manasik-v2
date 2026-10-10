import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import {
  getSeasonalPage,
  getSeasonalPages,
  getSeoServices,
  pick,
} from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateStaticParams() {
  const pages = await getSeasonalPages();
  return pages.filter((p) => p.isActive).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getSeasonalPage(slug);
  if (!page) return {};

  const title = pick(page.title, locale) || pick(page.name, locale);

  return getSeoMetadata({
    locale,
    path: `/seasonal/${page.slug}`,
    title,
    description: pick(page.description, locale),
    keywords: page.keywords?.[locale as 'ar' | 'en'] || page.keywords?.ar,
    openGraph: page.ogImage
      ? { images: [{ url: page.ogImage, alt: title }] }
      : undefined,
  });
}

export default async function SeasonalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = await getSeasonalPage(slug);
  if (!page || !page.isActive) notFound();

  const [t, tc] = await Promise.all([
    getTranslations('seoPages.seasonal'),
    getTranslations('seoPages.common'),
  ]);

  const services = (await getSeoServices()).filter(
    (s) => s.isActive && page.featuredServiceSlugs.includes(s.slug),
  );

  const name = pick(page.name, locale);
  const seasonNote = pick(page.seasonNote, locale);
  const intro = pick(page.intro, locale);
  const content = pick(page.content, locale);
  const ctaText = pick(page.ctaText, locale) || tc('learnMore');
  const ctaLink = pick(page.ctaLink, locale) || '/services';
  const isAr = locale === 'ar';

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name,
          description: pick(page.description, locale),
          url: `${BASE_URL}/${locale}/seasonal/${page.slug}`,
          inLanguage: isAr ? 'ar' : 'en',
          isPartOf: { '@type': 'WebSite', url: BASE_URL },
        }}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/seasonal' },
            { name, path: `/seasonal/${page.slug}` },
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
              { label: t('pageTitle'), href: '/seasonal' },
              { label: name },
            ]}
          />

          <h1 className="text-4xl font-bold text-foreground mb-3">{name}</h1>
          {seasonNote && (
            <p className="text-success font-medium mb-6">{seasonNote}</p>
          )}
          {intro && (
            <HtmlContent html={intro} className="text-lg text-secondary" />
          )}

          {services.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-foreground mb-5">
                {t('featuredServices')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="bg-card-bg border border-stroke rounded-site p-4 hover:border-success transition-colors"
                  >
                    <span className="font-semibold text-foreground">
                      {pick(service.name, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {content && (
            <section className="mt-10">
              <HtmlContent html={content} />
            </section>
          )}

          <FaqSection
            faqs={page.faqs || []}
            locale={locale}
            heading={tc('faqs')}
          />

          <CtaBlock
            title={name}
            ctaLabel={ctaText}
            ctaHref={ctaLink}
          />
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
