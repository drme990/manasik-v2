'use client';

import { useEffect, useRef, useState } from 'react';
import Marquee from 'react-fast-marquee';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import Image from 'next/image';
import { BadgeCheck, Star } from 'lucide-react';
import CountryFlag from '@/components/shared/country-flag';
import type { SeoReview } from '@/lib/seo-content';
import { reviewMonth } from '@/lib/review-date';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import ShareExperienceButton from '@/components/experience/share-experience-button';

function TestimonialCard({
  name,
  image,
  feedback,
  rating = 5,
  verifiedLabel,
  country,
  products = [],
  month = '',
}: {
  name: string;
  image?: string;
  feedback: string;
  rating?: number;
  /** Two-letter country code, shown as its flag by the name. */
  country?: string;
  /** «شراء موثّق»: shown as a green badge by the name (reviews from «شارك تجربتك»). */
  verifiedLabel?: string;
  /** What the customer bought, shown after «شراء موثّق» at the bottom of the card (owner, 2026-10-13). */
  products?: { slug: string; name: string }[];
  /** «أكتوبر 2026», when the review has a real date. */
  month?: string;
}) {
  const locale = useLocale();
  const local = Boolean(image && image.startsWith('/'));

  return (
    <figure
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col gap-3 w-[min(24rem,85vw)] h-52 rounded-site border border-stroke bg-card-bg p-6 mx-2"
    >
      <header className="flex items-center gap-3">
        <div className="relative w-9 h-9 shrink-0">
          {image && local ? (
            <Image
              src={image}
              alt={`${name}'s profile`}
              width={36}
              height={36}
              className="rounded-full object-cover"
              loading="lazy"
            />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a customer's photo from storage
            <img src={image} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-sm font-bold text-success" aria-hidden>
              {name.trim().charAt(0)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-1.5 text-base font-bold">
            {name}
            <CountryFlag code={country} />
            {verifiedLabel ? (
              <BadgeCheck size={21} strokeWidth={2.2} className="shrink-0 text-success" aria-label={verifiedLabel}>
                <title>{verifiedLabel}</title>
              </BadgeCheck>
            ) : null}
          </h3>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                className={i < rating ? 'text-yellow-500' : 'text-stroke'}
                fill="currentColor"
                key={i}
                size={14}
              />
            ))}
          </div>
        </div>
      </header>
      <blockquote className={`text-secondary text-sm leading-relaxed ${verifiedLabel || month ? 'line-clamp-3' : 'flex-1 line-clamp-4'}`}
        >
        {feedback}
      </blockquote>
      {verifiedLabel || month ? (
        <figcaption className="mt-auto flex min-w-0 items-center gap-1.5 text-xs font-medium text-success">
          {verifiedLabel ? (
            <>
              <BadgeCheck size={15} className="shrink-0" aria-hidden />
              <span className="shrink-0">{verifiedLabel}</span>
            </>
          ) : null}
          {products.length ? (
            <span className="min-w-0 truncate text-secondary">
              {' · '}
              {products.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 ? '، ' : null}
                  <Link href={`/products/${p.slug}`} className="underline-offset-2 hover:text-success hover:underline">
                    {p.name}
                  </Link>
                </span>
              ))}
            </span>
          ) : null}
          {month ? <span className="ms-auto shrink-0 font-normal text-secondary">{month}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The homepage reviews (owner, 2026-10-12): one section with the reviews page,
 * read from the dashboard — this site's reviews, and every experience approved
 * from «شارك تجربتك» joins it by itself. The fixed cards below only show if
 * the reviews can't be read.
 */
export default function Testimonials({ reviews = [] }: { reviews?: SeoReview[] }) {
  const t = useTranslations('landing.testimonials');
  // The moving rows stand still for whoever asked their phone for less motion (UI review, 2026-10-13).
  const [still, setStill] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setStill(q.matches);
    const on = () => setStill(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  // On a phone a touch leaves the card «hovered», so pause-on-hover froze a row (or one copy of it, which made
  // two cards overlap) until the next tap (owner's recording, 2026-10-13). Pause on hover only with a real mouse.
  const [mouse, setMouse] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMouse(window.matchMedia('(hover: hover) and (pointer: fine)').matches));
    return () => cancelAnimationFrame(id);
  }, []);
  // The rows start moving when they come up on the screen, so the visitor first sees the newest reviews
  // (owner, 2026-10-13); they also rest while off screen.
  const rowsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = rowsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const play = inView && !still;
  const ts = useTranslations('shareExperience');
  const tr = useTranslations('seoPages.reviews');
  const locale = useLocale();
  const live = reviews
    .filter((r) => r.isActive !== false)
    .map((r) => ({
      key: r._id,
      added: r.createdAt ? Date.parse(r.createdAt) || 0 : 0,
      name: r.customerName,
      image: r.avatarUrl || undefined,
      feedback: (locale === 'ar' ? r.text?.ar || r.text?.en : r.text?.en || r.text?.ar) || '',
      rating: r.rating,
      country: r.country,
      // «شراء موثّق» on every verified card, with what was bought when we know it (owner, 2026-10-13).
      verifiedLabel: r.experienceId || r.isVerified ? ts('verifiedPurchase') : undefined,
      products: (r.products || [])
        .map((p) => ({ slug: p.slug, name: ((locale === 'ar' ? p.name.ar || p.name.en : p.name.en || p.name.ar) || '').trim() }))
        .filter((p) => p.name),
      month: reviewMonth(r.date, locale),
    }))
    .filter((r) => r.feedback);
  // The two rows share the reviews in turn (owner, 2026-10-13): in the order they were added, the 1st goes to the
  // top row, the 2nd to the bottom one, the 3rd to the top… so each new one tops up the shorter row and no card
  // already shown moves to the other row. Each row keeps the newest first.
  const rowOf = new Map(
    [...live]
      .map((r, i) => ({ key: r.key, added: r.added, i }))
      .sort((a, b) => a.added - b.added || b.i - a.i)
      .map((r, n) => [r.key, n % 2] as const),
  );
  // Newest first in the direction each row moves (owner, 2026-10-13). The bottom row moves left: cards come in
  // from the right in list order, so newest first as it is. The top row moves right: after the first card the
  // next one comes in from the left, which is the END of the list; so it is laid out as [newest, oldest … 2nd],
  // and on screen it reads newest, 2nd, 3rd…
  const towardRight = <T,>(items: T[]) => (items.length > 2 ? [items[0], ...items.slice(1).reverse()] : items);
  const liveRow1 = towardRight(live.filter((r) => rowOf.get(r.key) === 0));
  const liveRow2 = live.length > 1 ? live.filter((r) => rowOf.get(r.key) === 1) : live;

  const testimonials = [
    {
      name: t('sampleName1'),
      image: '/testimonials/1.jpg',
      feedback: t('sampleFeedback1'),
    },
    {
      name: t('sampleName2'),
      image: '/testimonials/2.jpg',
      feedback: t('sampleFeedback2'),
    },
    {
      name: t('sampleName3'),
      image: '/testimonials/3.jpg',
      feedback: t('sampleFeedback3'),
    },
    {
      name: t('sampleName4'),
      image: '/testimonials/4.jpg',
      feedback: t('sampleFeedback4'),
    },
    {
      name: t('sampleName5'),
      image: '/testimonials/5.jpg',
      feedback: t('sampleFeedback5'),
    },
    {
      name: t('sampleName6'),
      image: '/testimonials/6.jpg',
      feedback: t('sampleFeedback6'),
    },
    {
      name: t('sampleName7'),
      image: '/testimonials/7.jpg',
      feedback: t('sampleFeedback7'),
    },
    {
      name: t('sampleName8'),
      image: '/testimonials/8.jpg',
      feedback: t('sampleFeedback8'),
    },
    {
      name: t('sampleName9'),
      image: '/testimonials/9.jpg',
      feedback: t('sampleFeedback9'),
    },
    {
      name: t('sampleName10'),
      image: '/testimonials/10.jpg',
      feedback: t('sampleFeedback10'),
    },
    {
      name: t('sampleName11'),
      image: '/testimonials/11.jpg',
      feedback: t('sampleFeedback11'),
    },
    {
      name: t('sampleName12'),
      image: '/testimonials/12.jpg',
      feedback: t('sampleFeedback12'),
    },
    {
      name: t('sampleName13'),
      image: '/testimonials/13.jpg',
      feedback: t('sampleFeedback13'),
    },
    {
      name: t('sampleName14'),
      image: '/testimonials/14.jpg',
      feedback: t('sampleFeedback14'),
    },
  ];

  return (
    <Section id="testimonials" className="px-0">
      <SectionUpTitle className="gbf gbf-md gbf-left gbf-bottom">
        {t('upTitle')}
      </SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>

      <div ref={rowsRef} className="flex flex-col gap-4" dir="ltr">
        <div data-mo="from-start">
        <Marquee direction="right" speed={40} gradient={false} autoFill play={play} pauseOnHover={mouse}>
          {live.length > 0 ? liveRow1.map((item) => (
            <TestimonialCard key={`r1-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} country={item.country} verifiedLabel={item.verifiedLabel} products={item.products} month={item.month} />
          )) : testimonials.slice(0, 7).map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row1-${index}`}
              name={name}
              image={image}
              feedback={feedback}
              verifiedLabel={tr('verified')}
            />
          ))}
        </Marquee>
        </div>
        <div data-mo="from-end">
        <Marquee direction="left" speed={40} gradient={false} autoFill play={play} pauseOnHover={mouse}>
          {live.length > 0 ? liveRow2.map((item) => (
            <TestimonialCard key={`r2-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} country={item.country} verifiedLabel={item.verifiedLabel} products={item.products} month={item.month} />
          )) : testimonials.slice(7).map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row2-${index}`}
              name={name}
              image={image}
              feedback={feedback}
              verifiedLabel={tr('verified')}
            />
          ))}
        </Marquee>
        </div>
      </div>
      {/* «شارك تجربتك» first; beside it, quieter, every review (owner, 2026-10-13). Also on the product pages. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 px-4">
        <ShareExperienceButton variant="soft" />
        <Link
          href="/reviews"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-site border border-stroke px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/5"
        >
          <Star size={17} className="text-warning" fill="currentColor" aria-hidden />
          {tr('allReviews')}
        </Link>
      </div>
    </Section>
  );
}
