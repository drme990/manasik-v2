import CalcAqeqa from '@/components/landing/calc-aqeqa';
import Faq from '@/components/landing/faq';
import Hero from '@/components/landing/hero';
import OurWorks from '@/components/landing/our-works';
import Products from '@/components/landing/products';
import Testimonials from '@/components/landing/testimonials';
import WhyUs from '@/components/landing/why-us';
import WorkSteps from '@/components/landing/work-steps';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import HomeMotion from '@/components/motion/home-motion';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getStaticPageText } from '@/lib/static-pages';
import { getSeoMetadata, buildOrganizationSchema, buildWebsiteSchema, buildFaqSchema } from '@/lib/seo';
import { getAppearanceFaqs } from '@/lib/seo-data';
import { getSeoReviews, getSeoSettings } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, db] = await Promise.all([
    getTranslations({ locale, namespace: 'seo.home' }),
    getStaticPageText('home', locale),
  ]);

  return getSeoMetadata({
    locale,
    path: '/',
    title: db.title ?? t('title'),
    description: db.description ?? t('description'),
    keywords: [
      'مناسك',
      'عمرة البدل',
      'عقيقة',
      'أضحية',
      'ذبح',
      'نذر',
      'صدقة',
      'حفر آبار',
      'وكالة شرعية',
      'manasik',
      'aqiqah',
      'sacrifice',
      'umrah proxy',
      'qurbani online',
    ],
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
    },
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // FAQs for FAQPage schema (must match visible content) + admin SEO settings
  const [faqs, settings, reviews] = await Promise.all([
    getAppearanceFaqs('manasik', locale),
    getSeoSettings(),
    getSeoReviews(),
  ]);

  const orgJsonLd = buildOrganizationSchema(locale, SITE_URL, settings);
  const websiteJsonLd = buildWebsiteSchema(locale, SITE_URL);
  const faqJsonLd = faqs.length > 0 ? buildFaqSchema(faqs) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <Header />
      <main className="mo-scope">
        <HomeMotion />
        <Hero />
        <div className="grid-bg">
          <OurWorks />
          <WorkSteps />
          <WhyUs />
          <Testimonials reviews={reviews} />
          <Products />
          <Faq />
          <CalcAqeqa />
        </div>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
