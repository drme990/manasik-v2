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
  if (!name) return null;

  return (
    <Link
      href={`/authors/${author.slug}`}
      className="group flex items-center gap-3"
    >
      {author.image ? (
        <Image
          src={author.image}
          alt={name}
          width={44}
          height={44}
          className="h-11 w-11 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <span className="gradient-site flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white">
          {name.charAt(0)}
        </span>
      )}
      <span>
        <span className="block text-xs text-secondary">{writtenByLabel}</span>
        <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-success">
          {name}
        </span>
        {title && <span className="block text-xs text-secondary">{title}</span>}
      </span>
    </Link>
  );
}
