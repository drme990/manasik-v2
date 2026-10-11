import { BookOpen } from 'lucide-react';
import ContentCard from './content-card';
import type { SeoBlogPost } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

export default function BlogCard({
  post,
  locale,
  readMoreLabel,
  categoryLabel,
}: {
  post: SeoBlogPost;
  locale: string;
  readMoreLabel: string;
  categoryLabel?: string;
}) {
  const date = post.datePublished
    ? new Date(post.datePublished).toLocaleDateString(
      locale === 'ar' ? 'ar-EG' : 'en-GB',
      { year: 'numeric', month: 'short', day: 'numeric' },
    )
    : undefined;

  return (
    <ContentCard
      href={`/blog/${post.category}/${post.slug}`}
      title={pick(post.title, locale)}
      description={pick(post.excerpt, locale) || pick(post.description, locale)}
      eyebrow={categoryLabel || post.category.replace(/-/g, ' ')}
      meta={date}
      image={post.coverImage}
      fallback={<BookOpen size={44} strokeWidth={1.5} aria-hidden="true" />}
      ctaLabel={readMoreLabel}
    />
  );
}
