import { BadgeCheck, Star } from 'lucide-react';
import CountryFlag from '@/components/shared/country-flag';
import type { SeoReview } from '@/lib/seo-content';
import { pickAny } from '@/lib/seo-content';
import { reviewMonth } from '@/lib/review-date';

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
          className={i < rounded ? 'fill-yellow-500 text-yellow-500' : 'text-stroke/40'}
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
            className="flex h-full flex-col gap-3 rounded-site border border-stroke bg-card-bg p-6"
          >
            {/* Same card as the homepage's reviews (owner, 2026-10-12). */}
            <header className="flex items-center gap-3">
              {review.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- customer photo from storage
                <img src={review.avatarUrl} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-sm font-bold text-success" aria-hidden="true">
                  {review.customerName.trim().charAt(0)}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
                  <span className="truncate">{review.customerName}</span>
                  <CountryFlag code={review.country} />
                  {review.experienceId || review.isVerified ? (
                    <BadgeCheck size={18} aria-label={purchaseLabel || verifiedLabel} className="shrink-0 fill-success text-white" />
                  ) : null}
                </span>
                <Stars rating={review.rating} />
              </div>
            </header>
            <blockquote className="flex-1 text-sm leading-relaxed text-secondary">
              {review.body}
            </blockquote>
            {/* «✓ شراء موثّق · المنتج» and the month, the same on every page (owner, 2026-10-13). */}
            {review.experienceId || review.isVerified || reviewMonth(review.date, locale) ? (
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {review.experienceId || review.isVerified ? (
                  <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-medium text-success">
                    <BadgeCheck size={14} aria-hidden="true" className="shrink-0" />
                    <span className="shrink-0">{purchaseLabel || verifiedLabel}</span>
                    {review.products?.length ? (
                      <span className="truncate text-secondary">
                        {' · '}
                        {review.products
                          .map((p) => (locale === 'ar' ? p.name.ar || p.name.en : p.name.en || p.name.ar))
                          .filter(Boolean)
                          .join('، ')}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span />
                )}
                {reviewMonth(review.date, locale) ? (
                  <time dateTime={review.date} className="shrink-0 text-secondary">
                    {reviewMonth(review.date, locale)}
                  </time>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
