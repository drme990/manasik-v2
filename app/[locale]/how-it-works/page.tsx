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

const NS = 'seoPages.howItWorks';

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
    path: '/how-it-works',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = await getTranslations(NS);
  const tc = await getTranslations('seoPages.common');

  const steps = t.raw('steps') as { h: string; p: string }[];

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: t('pageTitle'),
    description: t('pageDescription'),
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.h,
      text: s.p,
    })),
  };

  return (
    <>
      <JsonLd data={howToJsonLd} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/how-it-works' },
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

          <ol className="space-y-6">
            {steps.map((step, i) => (
              <li
                key={i}
                className="bg-card-bg border border-stroke rounded-site p-6 flex gap-4"
              >
                <span className="text-success text-3xl font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {step.h}
                  </h2>
                  <p className="text-secondary leading-relaxed">{step.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
