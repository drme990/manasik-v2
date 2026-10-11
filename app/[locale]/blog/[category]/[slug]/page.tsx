import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CalendarDays, RefreshCw } from 'lucide-react';
import AuthorInfo from '@/components/seo/author-info';
import Breadcrumb from '@/components/seo/breadcrumb';
import CtaBlock from '@/components/seo/cta-block';
import FaqSection from '@/components/seo/faq-section';
import HtmlContent from '@/components/seo/html-content';
import JsonLd from '@/components/seo/json-ld';
import PageShell from '@/components/seo/page-shell';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  getSeoMetadata,
  withBrand,
} from '@/lib/seo';
import {
  getSeoAuthor,
  getSeoBlogPost,
  getSeoService,
  pick,
} from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const post = await getSeoBlogPost(category, slug);
  if (!post || !post.isActive || !pick(post.title, locale)) notFound();

  const title = withBrand(pick(post.title, locale), locale);

  return getSeoMetadata({
    locale,
    path: `/blog/${post.category}/${post.slug}`,
    title,
    description: pick(post.description, locale),
    keywords: post.keywords?.[locale as 'ar' | 'en'],
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
  if (!post || !post.isActive || !pick(post.title, locale)) notFound();

  const [t, tc, author, relatedService] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.blog' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    post.authorId ? getSeoAuthor(post.authorId) : Promise.resolve(null),
    post.relatedServiceSlug
      ? getSeoService(post.relatedServiceSlug)
      : Promise.resolve(null),
  ]);

  const title = pick(post.title, locale);
  const description = pick(post.description, locale);
  const content = pick(post.content, locale);
  const categoryLabel = t.has(`categories.${post.category}`)
    ? t(`categories.${post.category}`)
    : post.category.replace(/-/g, ' ');

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      : null;
  const showModified =
    post.dateModified &&
    formatDate(post.dateModified) !== formatDate(post.datePublished);

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
            datePublished: post.datePublished,
            dateModified: post.dateModified,
            coverImage: post.coverImage,
          },
          author ? { name: author.name, slug: author.slug } : null,
          SITE_URL,
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
          SITE_URL,
        )}
      />
      <PageShell narrow>
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/' },
            { label: t('pageTitle'), href: '/blog' },
            { label: title },
          ]}
        />

        <article>
          <header className="mb-8">
            <span className="inline-flex rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              {categoryLabel}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-4 text-lg leading-relaxed text-secondary">
                {description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-stroke/30 py-4 text-sm text-secondary">
              {author && (
                <AuthorInfo
                  author={author}
                  locale={locale}
                  writtenByLabel={t('writtenBy')}
                />
              )}
              {post.datePublished && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={16} aria-hidden="true" />
                  {t('published')}:{' '}
                  <time dateTime={post.datePublished}>
                    {formatDate(post.datePublished)}
                  </time>
                </span>
              )}
              {showModified && (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw size={16} aria-hidden="true" />
                  {t('updated')}:{' '}
                  <time dateTime={post.dateModified}>
                    {formatDate(post.dateModified)}
                  </time>
                </span>
              )}
            </div>
          </header>

          {post.coverImage && (
            <div className="relative mb-10 aspect-16/6 w-full overflow-hidden rounded-site border border-stroke">
              <Image
                src={post.coverImage}
                alt={title}
                fill
                sizes="(min-width: 896px) 896px, 100vw"
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}

          <HtmlContent html={content} className="text-lg" />

          <FaqSection faqs={post.faqs} locale={locale} heading={t('faqs')} />
        </article>

        {relatedService && pick(relatedService.name, locale) && (
          <CtaBlock
            title={pick(relatedService.name, locale)}
            subtitle={pick(relatedService.description, locale)}
            ctaLabel={tc('learnMore')}
            ctaHref={`/services/${relatedService.slug}`}
          />
        )}
      </PageShell>
    </>
  );
}
