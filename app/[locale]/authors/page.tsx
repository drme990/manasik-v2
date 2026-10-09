import { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import { Link } from '@/i18n/routing';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoAuthors, pick } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.authors' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/authors',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function AuthorsPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.authors');
  const tc = await getTranslations('seoPages.common');

  const authors = (await getSeoAuthors()).filter((a) => a.isActive);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/authors' },
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

          {authors.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {authors.map((author) => (
                <Link
                  key={author._id}
                  href={`/authors/${author.slug}`}
                  className="group bg-card-bg border border-stroke rounded-site p-6 hover:border-success transition-colors flex items-center gap-4"
                >
                  {author.image && (
                    <Image
                      src={author.image}
                      alt={pick(author.name, locale)}
                      width={56}
                      height={56}
                      className="rounded-full object-cover shrink-0"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-foreground group-hover:text-success transition-colors">
                      {pick(author.name, locale)}
                    </h2>
                    {pick(author.title, locale) && (
                      <p className="text-secondary text-sm">
                        {pick(author.title, locale)}
                      </p>
                    )}
                  </div>
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
