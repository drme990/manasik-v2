'use client';

import Marquee from 'react-fast-marquee';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import Image from 'next/image';
import { BadgeCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EXPERIENCE_APP } from '@/lib/experience';
import { useLocale, useTranslations } from 'next-intl';
import ShareExperienceButton from '@/components/experience/share-experience-button';

function TestimonialCard({
  name,
  image,
  feedback,
  rating = 5,
  verifiedLabel,
}: {
  name: string;
  image?: string;
  feedback: string;
  rating?: number;
  /** «شراء موثّق»: shown as a green badge by the name (reviews from «شارك تجربتك»). */
  verifiedLabel?: string;
}) {
  const locale = useLocale();
  const local = Boolean(image && image.startsWith('/'));

  return (
    <figure
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col gap-3 w-96 h-52 rounded-site border border-stroke bg-card-bg p-6 mx-2"
      aria-labelledby={`testimonial-${name}`}
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
          <h3 id={`testimonial-${name}`} className="flex items-center gap-1.5 text-base font-bold">
            {name}
            {verifiedLabel ? (
              <BadgeCheck size={18} className="shrink-0 fill-success text-white" aria-label={verifiedLabel}>
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
      <blockquote
        className="text-secondary text-sm leading-relaxed flex-1 line-clamp-4"
        aria-label={`Testimonial description from ${name}`}
      >
        {feedback}
      </blockquote>
    </figure>
  );
}

interface ApprovedExperience {
  _id: string;
  customerName: string;
  rating: number;
  text: { ar?: string; en?: string };
  avatarUrl?: string;
  experienceId?: string | null;
}

/** Written experiences approved in the dashboard (owner, 2026-10-12), newest first. */
function useApprovedExperiences(locale: string) {
  const [items, setItems] = useState<{ key: string; name: string; image?: string; feedback: string; rating: number }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/seo/reviews?platform=${EXPERIENCE_APP}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data?.success) return;
        const list = (data.data as ApprovedExperience[])
          .filter((r) => r.experienceId)
          .map((r) => ({
            key: r._id,
            name: r.customerName,
            image: r.avatarUrl || undefined,
            feedback: (locale === 'ar' ? r.text.ar || r.text.en : r.text.en || r.text.ar) || '',
            rating: r.rating,
          }))
          .filter((r) => r.feedback);
        setItems(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [locale]);
  return items;
}

export default function Testimonials() {
  const t = useTranslations('landing.testimonials');
  const ts = useTranslations('shareExperience');
  const locale = useLocale();
  const approved = useApprovedExperiences(locale);
  const approvedRow1 = approved.filter((_, i) => i % 2 === 0);
  const approvedRow2 = approved.filter((_, i) => i % 2 === 1);

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
        <Marquee direction="right" speed={40} gradient={false} autoFill>
          {approvedRow1.map((item) => (
            <TestimonialCard key={`exp-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} verifiedLabel={ts('verifiedPurchase')} />
          ))}
          {testimonials.slice(0, 7).map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row1-${index}`}
              name={name}
              image={image}
              feedback={feedback}
            />
          ))}
        </Marquee>
        </div>
        <div data-mo="from-end">
        <Marquee direction="left" speed={40} gradient={false} autoFill>
          {approvedRow2.map((item) => (
            <TestimonialCard key={`exp-${item.key}`} name={item.name} image={item.image} feedback={item.feedback} rating={item.rating} verifiedLabel={ts('verifiedPurchase')} />
          ))}
          {testimonials.slice(7).map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row2-${index}`}
              name={name}
              image={image}
              feedback={feedback}
            />
          ))}
        </Marquee>
        </div>
      </div>
      <ShareExperienceButton variant="soft" wrap="mt-8 flex justify-center px-4" />
    </Section>
  );
}
