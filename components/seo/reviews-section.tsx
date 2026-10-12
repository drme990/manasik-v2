import { BadgeCheck, Quote, Star } from 'lucide-react';
import type { SeoReview } from '@/lib/seo-content';
import { pickAny } from '@/lib/seo-content';

// Customer reviews. No AggregateRating/Review JSON-LD on purpose: Google does
// not show review snippets for self-serving reviews of your own business, and
// a standalone AggregateRating without `itemReviewed` is invalid markup.
function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          className={i < rounded ? 'fill-warning text-warning' : 'text-stroke/40'}
        />
      ))}
    </span>
  );
}

export default function ReviewsSection({
  reviews,
  locale,
  heading,
  verifiedLabel,
  purchaseLabel,
}: {
  reviews: SeoReview[];
  locale: string;
  heading?: string;
  verifiedLabel: string;
  /** «شراء موثّق»: reviews sent through «شارك تجربتك» by a customer with a fully paid order. */
  purchaseLabel?: string;
}) {
  const items = reviews
    .map((r) => ({ ...r, body: pickAny(r.text, locale) }))
    .filter((r) => r.body);
  if (!items.length) return null;

  return (
    <section className={heading ? 'mt-14' : undefined}>
      {heading && (
        <h2 className="mb-6 text-2xl font-bold text-foreground">{heading}</h2>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((review) => (
          <figure
            key={review._id}
            className="flex h-full flex-col gap-4 rounded-site border border-stroke bg-card-bg p-5"
          >
            <div className="flex items-center justify-between">
              <Stars rating={review.rating} />
              <Quote size={20} aria-hidden="true" className="text-success/40" />
            </div>
            <blockquote className="flex-1 text-sm leading-relaxed text-foreground/80">
              {review.body}
            </blockquote>
            <figcaption className="flex items-center justify-between gap-2 border-t border-stroke/30 pt-3">
              {review.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- customer photo from storage
                <img src={review.avatarUrl} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : null}
              <span className="me-auto min-w-0">
                <span className="block truncate font-semibold text-foreground">
                  {review.customerName}
                </span>
                {review.country && (
                  <span className="block text-xs text-secondary">
                    {review.country}
                  </span>
                )}
              </span>
              {review.experienceId ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
                  <BadgeCheck size={18} aria-hidden="true" className="fill-success text-white" />
                  {purchaseLabel || verifiedLabel}
                </span>
              ) : review.isVerified && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  <BadgeCheck size={14} aria-hidden="true" />
                  {verifiedLabel}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
