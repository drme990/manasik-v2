import Image from 'next/image';
import { Link } from '@/i18n/routing';
import type { SeoAuthor } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

// Compact author attribution block for blog articles.
export default function AuthorInfo({
  author,
  locale,
  writtenByLabel,
}: {
  author: SeoAuthor;
  locale: string;
  writtenByLabel: string;
}) {
  const name = pick(author.name, locale);
  const title = pick(author.title, locale);

  return (
    <Link
      href={`/authors/${author.slug}`}
      className="flex items-center gap-3 group"
    >
      {author.image && (
        <Image
          src={author.image}
          alt={name}
          width={44}
          height={44}
          className="rounded-full object-cover"
        />
      )}
      <div>
        <span className="block text-xs text-secondary">{writtenByLabel}</span>
        <span className="block text-sm font-semibold text-foreground group-hover:text-success transition-colors">
          {name}
        </span>
        {title && (
          <span className="block text-xs text-secondary">{title}</span>
        )}
      </div>
    </Link>
  );
}
