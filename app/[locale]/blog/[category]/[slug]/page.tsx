import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogArticle from '@/components/seo/blog-article';
import { getSeoMetadata, withBrand } from '@/lib/seo';
import { getSeoBlogPost, pick } from '@/lib/seo-content';

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

  return <BlogArticle post={post} locale={locale} />;
}
