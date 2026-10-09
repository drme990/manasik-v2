import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import AuthorInfo from '@/components/seo/author-info';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  getSeoMetadata,
} from '@/lib/seo';
import {
  getSeoAuthor,
  getSeoBlogPost,
  getSeoBlogPosts,
  pick,
} from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateStaticParams() {
  const posts = await getSeoBlogPosts();
  return posts
    .filter((p) => p.isActive)
    .map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const post = await getSeoBlogPost(category, slug);
  if (!post) return {};

  const title = pick(post.title, locale);
  const description = pick(post.description, locale);
  const keywords =
    post.keywords?.[locale as 'ar' | 'en'] || post.keywords?.ar;

  return getSeoMetadata({
    locale,
    path: `/blog/${post.category}/${post.slug}`,
    title,
    description,
    keywords,
    openGraph: {
      type: 'article',
      ...(post.coverImage
        ? { images: [{ url: post.coverImage, alt: title }] }
        : {}),
      ...(post.datePublished ? { publishedTime: post.datePublished } : {}),
      ...(post.dateModified ? { modifiedTime: post.dateModified } : {}),
    },
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale, category, slug } = await params;
  const post = await getSeoBlogPost(category, slug);
  if (!post || !post.isActive) notFound();

  const [t, tc] = await Promise.all([
    getTranslations('seoPages.blog'),
    getTranslations('seoPages.common'),
  ]);

  const author = post.authorId ? await getSeoAuthor(post.authorId) : null;
  // authorId may be an ObjectId — try slug lookup fallback by matching _id
  const resolvedAuthor = author || null;

  const title = pick(post.title, locale);
  const content = pick(post.content, locale);

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

  return (
    <>
      <JsonLd
        data={buildArticleSchema(
          locale,
          {
            title: post.title,
            description: post.description,
            slug: post.slug,
            category: post.category,
            datePublished: post.datePublished || new Date(),
            dateModified: post.dateModified || post.datePublished || new Date(),
            coverImage: post.coverImage,
          },
          resolvedAuthor
            ? { name: resolvedAuthor.name, slug: resolvedAuthor.slug }
            : null,
          BASE_URL,
        )}
      />
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/blog' },
            { name: title, path: `/blog/${post.category}/${post.slug}` },
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
              { label: t('pageTitle'), href: '/blog' },
              { label: title },
            ]}
          />

          <article>
            <header className="mb-8">
              <span className="text-xs text-secondary uppercase tracking-wide">
                {post.category.replace(/-/g, ' ')}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                {resolvedAuthor && (
                  <AuthorInfo
                    author={resolvedAuthor}
                    locale={locale}
                    writtenByLabel={t('writtenBy')}
                  />
                )}
                {post.datePublished && (
                  <span>
                    {t('published')}: {formatDate(post.datePublished)}
                  </span>
                )}
                {post.dateModified && (
                  <span>
                    {t('updated')}: {formatDate(post.dateModified)}
                  </span>
                )}
              </div>
            </header>

            {post.coverImage && (
              <div className="relative w-full h-64 md:h-96 rounded-site overflow-hidden mb-8">
                <Image
                  src={post.coverImage}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <HtmlContent html={content} />

            <FaqSection
              faqs={post.faqs}
              locale={locale}
              heading={t('faqs')}
            />
          </article>

          {post.relatedServiceSlug && (
            <CtaBlock
              title={t('relatedServiceTitle')}
              ctaLabel={tc('learnMore')}
              ctaHref={`/services/${post.relatedServiceSlug}`}
            />
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
