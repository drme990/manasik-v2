import JsonLd from './json-ld';
import { buildAggregateRatingSchema } from '@/lib/seo';
import type { SeoReview } from '@/lib/seo-content';
import { pick } from '@/lib/seo-content';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-warning text-sm" aria-label={`${rating}/5`}>
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export default function ReviewsSection({
  reviews,
  locale,
  heading,
  verifiedLabel,
}: {
  reviews: SeoReview[];
  locale: string;
  heading: string;
  verifiedLabel: string;
}) {
  if (!reviews.length) return null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-foreground mb-5">{heading}</h2>
      <JsonLd data={buildAggregateRatingSchema(reviews)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review) => (
          <div
            key={review._id}
            className="bg-card-bg border border-stroke rounded-site p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">
                {review.customerName}
                {review.country && (
                  <span className="text-secondary text-xs font-normal ms-2">
                    {review.country}
                  </span>
                )}
              </span>
              <Stars rating={review.rating} />
            </div>
            <p className="text-secondary text-sm leading-relaxed">
              {pick(review.text, locale)}
            </p>
            {review.isVerified && (
              <span className="text-success text-xs mt-2 inline-block">
                ✓ {verifiedLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
