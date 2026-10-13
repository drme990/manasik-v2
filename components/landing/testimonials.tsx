'use client';

import { useEffect, useState } from 'react';
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
}: {
  name: string;
  image?: string;
  feedback: string;
  rating?: number;
  /** Two-letter country code, shown as its flag by the name. */
  country?: string;
  /** «شراء موثّق»: shown as a green badge by the name (reviews from «شارك تجربتك»). */
  verifiedLabel?: string;
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
      <blockquote className="text-secondary text-sm leading-relaxed flex-1 line-clamp-4"
        >
        {feedback}
      </blockquote>
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
  const ts = useTranslations('shareExperience');
  const tr = useTranslations('seoPages.reviews');
  const locale = useLocale();
  const live = reviews
    .filter((r) => r.isActive !== false)
    .map((r) => ({
      key: r._id,
      name: r.customerName,
      image: r.avatarUrl || undefined,
      feedback: (locale === 'ar' ? r.text?.ar || r.text?.en : r.text?.en || r.text?.ar) || '',
      rating: r.rating,
      country: r.country,
      verifiedLabel: r.experienceId ? ts('verifiedPurchase') : r.isVerified ? tr('verified') : undefined,
    }))
    .filter((r) => r.feedback);
  const half = Math.ceil(live.length / 2);
  const liveRow1 = live.slice(0, half);
  const liveRow2 = live.length > 1 ? live.slice(half) : live;

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

      <div className="flex flex-col gap-4" dir="ltr">
        <div data-mo="from-start">
        <Marquee direction="right" speed={40} gradient={false} autoFill play={!still} pauseOnHover pauseOnClick>
          {live.length > 0 ? liveRow1.map((item) => (
            <TestimonialCard key={`r1-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} country={item.country} verifiedLabel={item.verifiedLabel} />
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
        <Marquee direction="left" speed={40} gradient={false} autoFill play={!still} pauseOnHover pauseOnClick>
          {live.length > 0 ? liveRow2.map((item) => (
            <TestimonialCard key={`r2-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} country={item.country} verifiedLabel={item.verifiedLabel} />
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
