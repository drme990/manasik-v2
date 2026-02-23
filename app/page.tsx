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

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'مؤسسة مناسك',
  alternateName: 'Manasik',
  url: 'https://www.manasik.net',
  logo: 'https://www.manasik.net/logo-light.png',
  description:
    'مؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية أداء العمرة، الحج، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار. خدمات موثوقة بتوثيق احترافي.',
  sameAs: ['https://www.manasik.net'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Arabic', 'English'],
  },
  serviceType: [
    'عمرة البدل',
    'حج البدل',
    'العقيقة',
    'الأضاحي',
    'النذر',
    'الصدقة',
    'حفر الآبار',
  ],
};

export const metadata: Metadata = {
  title: {
    absolute: 'مؤسسة مناسك | عمرة وحج وعقيقة وأضحية بالوكالة الشرعية',
  },
  description:
    'مُؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية أداء العمرة، الحج، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار. خدمات موثوقة بتوثيق احترافي.',
  keywords: [
    'مناسك',
    'عمرة البدل',
    'حج البدل',
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
    'hajj proxy',
  ],
  alternates: {
    canonical: 'https://www.manasik.net',
  },
  openGraph: {
    title: 'مؤسسة مناسك | عمرة وحج وعقيقة وأضحية بالوكالة الشرعية',
    description:
      'نُؤدي عنك بالوكالة الشرعية: عمرة البدل، حج البدل، العقيقة، الأضاحي، النذر، الصدقة، حفر الآبار. التزام شرعي وتوثيق احترافي.',
    url: 'https://www.manasik.net',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
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
