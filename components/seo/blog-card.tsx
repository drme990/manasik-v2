import { Link } from '@/i18n/routing';
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
  const title = pick(post.title, locale);
  const excerpt = pick(post.excerpt, locale) || pick(post.description, locale);

  return (
    <Link
      href={`/blog/${post.category}/${post.slug}`}
      className="group block bg-card-bg border border-stroke rounded-site p-6 hover:border-success transition-colors"
    >
      <span className="text-xs text-secondary uppercase tracking-wide">
        {categoryLabel || post.category.replace(/-/g, ' ')}
      </span>
      <h2 className="text-lg font-bold text-foreground group-hover:text-success transition-colors mt-1 mb-2">
        {title}
      </h2>
      {excerpt && (
        <p className="text-secondary text-sm leading-relaxed line-clamp-3 mb-3">
          {excerpt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
        </p>
      )}
      <span className="text-success text-sm font-medium">
        {readMoreLabel} {locale === 'ar' ? '←' : '→'}
      </span>
    </Link>
  );
}
