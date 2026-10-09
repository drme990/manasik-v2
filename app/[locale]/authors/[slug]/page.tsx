import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import BlogCard from '@/components/seo/blog-card';
import Breadcrumb from '@/components/seo/breadcrumb';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import {
  buildBreadcrumbSchema,
  buildPersonSchema,
  getSeoMetadata,
} from '@/lib/seo';
import {
  getSeoAuthor,
  getSeoAuthors,
  getSeoBlogPosts,
  pick,
} from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateStaticParams() {
  const authors = await getSeoAuthors();
  return authors.filter((a) => a.isActive).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getSeoAuthor(slug);
  if (!author) return {};

  const name = pick(author.name, locale);
  const bio = pick(author.bio, locale);

  return getSeoMetadata({
    locale,
    path: `/authors/${author.slug}`,
    title: name,
    description: bio ? bio.replace(/<[^>]*>/g, ' ').slice(0, 160) : name,
    openGraph: author.image
      ? { images: [{ url: author.image, alt: name }] }
      : undefined,
  });
}

export default async function AuthorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const author = await getSeoAuthor(slug);
  if (!author || !author.isActive) notFound();

  const [t, tc] = await Promise.all([
    getTranslations('seoPages.authors'),
    getTranslations('seoPages.common'),
  ]);

  const posts = (await getSeoBlogPosts()).filter(
    (p) => p.isActive && p.authorId === author._id,
  );

  const name = pick(author.name, locale);
  const title = pick(author.title, locale);
  const bio = pick(author.bio, locale);
  const qualifications = pick(author.qualifications, locale);

  return (
    <>
      <JsonLd
        data={buildPersonSchema(
          locale,
          {
            name: author.name,
            title: author.title || { ar: '', en: '' },
            bio: author.bio || { ar: '', en: '' },
            slug: author.slug,
            image: author.image,
          },
          BASE_URL,
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
          BASE_URL,
        )}
      />
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8 max-w-3xl">
          <Breadcrumb
            items={[
              { label: tc('home'), href: '/' },
              { label: t('pageTitle'), href: '/authors' },
              { label: name },
            ]}
          />

          <div className="flex items-start gap-5 mb-8">
            {author.image && (
              <Image
                src={author.image}
                alt={name}
                width={96}
                height={96}
                className="rounded-full object-cover shrink-0"
                priority
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{name}</h1>
              {title && (
                <p className="text-success font-medium mt-1">{title}</p>
              )}
            </div>
          </div>

          {bio && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('bio')}
              </h2>
              <HtmlContent html={bio} />
            </section>
          )}

          {qualifications && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('qualifications')}
              </h2>
              <HtmlContent html={qualifications} />
            </section>
          )}

          {author.externalLinks.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('links')}
              </h2>
              <ul className="space-y-2">
                {author.externalLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {posts.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-foreground mb-5">
                {t('articlesBy')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {posts.map((post) => (
                  <BlogCard
                    key={post._id}
                    post={post}
                    locale={locale}
                    readMoreLabel={tc('readMore')}
                  />
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
