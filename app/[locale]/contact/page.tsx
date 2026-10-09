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
import { getSeoSettings } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

const NS = 'seoPages.contact';

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
    path: '/contact',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations(NS);
  const tc = await getTranslations('seoPages.common');
  const settings = await getSeoSettings();

  const email = settings?.organizationContactEmail || 'info@manasik.net';
  const phone = settings?.organizationContactPhone || '+201027282396';
  const whatsapp = phone.replace(/[^0-9]/g, '');

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: t('pageTitle'),
    url: `${BASE_URL}/${locale}/contact`,
    isPartOf: { '@type': 'WebSite', url: BASE_URL },
    mainEntity: {
      '@type': 'Organization',
      name:
        settings?.organizationName?.[locale as 'ar' | 'en'] ||
        'Manasik Foundation',
      email,
      telephone: phone,
      url: BASE_URL,
    },
  };

  return (
    <>
      <JsonLd data={contactJsonLd} />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/contact' },
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

          <div className="space-y-4">
            <a
              href={`mailto:${email}`}
              className="block bg-card-bg border border-stroke rounded-site p-5 hover:border-success transition-colors"
            >
              <h2 className="font-bold text-foreground mb-1">
                {t('email')}
              </h2>
              <span className="text-success" dir="ltr">
                {email}
              </span>
            </a>
            <a
              href={`tel:${phone}`}
              className="block bg-card-bg border border-stroke rounded-site p-5 hover:border-success transition-colors"
            >
              <h2 className="font-bold text-foreground mb-1">
                {t('phone')}
              </h2>
              <span className="text-success" dir="ltr">
                {phone}
              </span>
            </a>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card-bg border border-stroke rounded-site p-5 hover:border-success transition-colors"
            >
              <h2 className="font-bold text-foreground mb-1">
                {t('whatsapp')}
              </h2>
              <span className="text-success" dir="ltr">
                {phone}
              </span>
            </a>
          </div>
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
