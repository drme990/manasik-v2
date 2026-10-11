import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import BlogCard from '@/components/seo/blog-card';
import Breadcrumb from '@/components/seo/breadcrumb';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import PageShell from '@/components/seo/page-shell';
import {
  buildBreadcrumbSchema,
  buildPersonSchema,
  getSeoMetadata,
  withBrand,
} from '@/lib/seo';
import {
  getSeoAuthor,
  getSeoBlogPosts,
  pick,
} from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

const toText = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getSeoAuthor(slug);
  if (!author || !author.isActive || !pick(author.name, locale)) notFound();

  const name = pick(author.name, locale);
  const jobTitle = pick(author.title, locale);
  const bio = toText(pick(author.bio, locale));
  const title = withBrand(jobTitle ? `${name} — ${jobTitle}` : name, locale);

  return getSeoMetadata({
    locale,
    path: `/authors/${author.slug}`,
    title,
    description: bio ? bio.slice(0, 160) : name,
    openGraph: {
      type: 'profile',
      ...(author.image ? { images: [{ url: author.image, alt: name }] } : {}),
    },
  });
}

export default async function AuthorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const author = await getSeoAuthor(slug);
  if (!author || !author.isActive || !pick(author.name, locale)) notFound();

  const [t, tc, tb, allPosts] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.authors' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getTranslations({ locale, namespace: 'seoPages.blog' }),
    getSeoBlogPosts(),
  ]);

  const posts = allPosts.filter(
    (p) => p.isActive && p.authorId === author._id && pick(p.title, locale),
  );

  const name = pick(author.name, locale);
  const title = pick(author.title, locale);
  const bio = pick(author.bio, locale);
  const qualifications = pick(author.qualifications, locale);
  const links = author.externalLinks.filter((l) =>
    /^https?:\/\//.test(l.url),
  );

  return (
    <>
      <JsonLd
        data={buildPersonSchema(
          locale,
          {
            name: author.name,
            title: author.title,
            bio: author.bio,
            slug: author.slug,
            image: author.image,
            externalLinks: links,
          },
          SITE_URL,
        )}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/authors' },
            { name, path: `/authors/${author.slug}` },
          ],
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/authors' },
            { label: name },
          ]}
        />

        <header className="mb-10 flex flex-col items-center gap-5 rounded-site border border-stroke bg-card-bg p-8 text-center sm:flex-row sm:text-start">
          {author.image ? (
            <Image
              src={author.image}
              alt={name}
              width={112}
              height={112}
              className="h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-success/15"
              priority
              unoptimized
            />
          ) : (
            <span className="gradient-site flex h-28 w-28 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white ring-4 ring-success/15">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground">{name}</h1>
            {title && (
              <span className="mt-3 inline-flex rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                {title}
              </span>
            )}
            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stroke px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-success/40 hover:text-success"
                  >
                    {link.label}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        {bio && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground">{t('bio')}</h2>
            <HtmlContent html={bio} />
          </section>
        )}

        {qualifications && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              {t('qualifications')}
            </h2>
            <HtmlContent html={qualifications} />
          </section>
        )}

        {posts.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              {t('articlesBy')}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {posts.map((post) => (
                <BlogCard
                  key={post._id}
                  post={post}
                  locale={locale}
                  readMoreLabel={tc('readMore')}
                  categoryLabel={
                    tb.has(`categories.${post.category}`)
                      ? tb(`categories.${post.category}`)
                      : post.category.replace(/-/g, ' ')
                  }
                />
              ))}
            </div>
          </section>
        )}
      </PageShell>
    </>
  );
}
