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
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSeoMetadata, buildOrganizationSchema, buildWebsiteSchema, buildFaqSchema } from '@/lib/seo';
import { getAppearanceFaqs } from '@/lib/seo-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.home' });

  return getSeoMetadata({
    locale,
    path: '/',
    title: t('title'),
    description: t('description'),
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
  const baseUrl = (process.env.BASE_URL || 'https://www.manasik.net').replace(/\/$/, '');

  const orgJsonLd = buildOrganizationSchema(locale, baseUrl);
  const websiteJsonLd = buildWebsiteSchema(locale, baseUrl);

  // Fetch FAQs for FAQPage schema (must match visible content)
  const faqs = await getAppearanceFaqs('manasik', locale);
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
      <main>
        <Hero />
        <div className="grid-bg">
          <OurWorks />
          <WorkSteps />
          <WhyUs />
          <Testimonials />
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
