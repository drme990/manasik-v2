import { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import Breadcrumb from '@/components/seo/breadcrumb';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { Link } from '@/i18n/routing';
import { buildBreadcrumbSchema, pageMetadata } from '@/lib/seo';
import { getSeoAuthors, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'authors', '/authors');
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

export default async function AuthorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, allAuthors] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.authors' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoAuthors(),
  ]);

  const authors = allAuthors.filter((a) => a.isActive && pick(a.name, locale));

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/authors' },
          ],
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]} />
        <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

        {authors.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => {
              const name = pick(author.name, locale);
              const title = pick(author.title, locale);
              return (
                <Link
                  key={author._id}
                  href={`/authors/${author.slug}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-site border border-stroke bg-card-bg p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
                >
                  {author.image ? (
                    <Image
                      src={author.image}
                      alt={name}
                      width={88}
                      height={88}
                      className="h-22 w-22 rounded-full object-cover ring-4 ring-success/15"
                      unoptimized
                    />
                  ) : (
                    <span className="gradient-site flex h-22 w-22 items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-success/15">
                      {initials(name)}
                    </span>
                  )}
                  <h2 className="text-lg font-bold text-foreground transition-colors group-hover:text-success">
                    {name}
                  </h2>
                  {title && (
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      {title}
                    </span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-success">
                    {tc('learnMore')}
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="transition-transform rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </PageShell>
    </>
  );
}
