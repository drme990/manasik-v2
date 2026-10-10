import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoCountries, pick } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.countries' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/countries',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function CountriesPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.countries');
  const tc = await getTranslations('seoPages.common');

  const countries = (await getSeoCountries()).filter((c) => c.isActive);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/countries' },
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
          </div>

          {countries.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {countries.map((country) => (
                <Link
                  key={country._id}
                  href={`/countries/${country.slug}`}
                  className="group bg-card-bg border border-stroke rounded-site p-6 hover:border-success transition-colors"
                >
                  <span className="text-xs text-secondary uppercase tracking-wide">
                    {country.countryCode}
                  </span>
                  <h2 className="text-xl font-bold text-foreground group-hover:text-success transition-colors mt-1 mb-2">
                    {pick(country.title, locale)}
                  </h2>
                  <p className="text-secondary text-sm leading-relaxed line-clamp-2">
                    {pick(country.description, locale)}
                  </p>
                  <span className="text-success text-sm font-medium mt-3 inline-block">
                    {tc('learnMore')} {locale === 'ar' ? '←' : '→'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
