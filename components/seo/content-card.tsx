import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

// Unified listing card for SEO pages (services, blog, countries, seasonal).
// Same visual language as the product card: media on top, equal heights,
// CTA pinned to the bottom, subtle lift on hover.
export default function ContentCard({
  href,
  title,
  description,
  eyebrow,
  meta,
  image,
  fallback,
  ctaLabel,
  as: Heading = 'h3',
  className,
}: {
  href: string;
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: string;
  image?: string;
  fallback?: React.ReactNode;
  ctaLabel: string;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  const text = description
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-site border border-stroke bg-card-bg',
        'transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success',
        className,
      )}
    >
      {(image || fallback) && (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="gradient-site flex h-full w-full items-center justify-center text-white">
              {fallback}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {(eyebrow || meta) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {eyebrow && (
              <span className="rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success">
                {eyebrow}
              </span>
            )}
            {meta && <span className="text-secondary">{meta}</span>}
          </div>
        )}
        <Heading className="line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-success">
          {title}
        </Heading>
        {text && (
          <p className="line-clamp-3 text-sm leading-relaxed text-secondary">
            {text}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-success">
          {ctaLabel}
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-300 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
