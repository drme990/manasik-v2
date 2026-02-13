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

export const metadata: Metadata = {
  title: 'الصفحة الرئيسية',
  description:
    'مُؤسسة مناسك - نُؤدي عنك بالوكالة الشرعية أداء العمرة، الحج، العقيقة، الأضاحي، النذر، الصدقة، وحفر الآبار. خدمات موثوقة بتوثيق احترافي.',
  alternates: {
    canonical: 'https://www.manasik.net',
  },
};

export default function HomePage() {
  return (
    <>
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
