import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

const NS = 'seoPages.paymentFromEurope';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: NS });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/payment-from-europe',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function PaymentFromEuropePage() {
  const locale = await getLocale();
  const t = await getTranslations(NS);
  const tc = await getTranslations('seoPages.common');

  const sections = t.raw('sections') as { h: string; p: string }[];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/payment-from-europe' },
          ],
          BASE_URL,
        )}
      />
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8 max-w-3xl">
          <Breadcrumb
            items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]}
          />
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {t('pageTitle')}
          </h1>
          <p className="text-secondary mb-10">{t('pageDescription')}</p>
          {sections.map((s, i) => (
            <section key={i} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {s.h}
              </h2>
              <p className="text-secondary leading-relaxed">{s.p}</p>
            </section>
          ))}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
