'use client';

import Marquee from 'react-fast-marquee';
import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

function TestimonialCard({
  name,
  image,
  feedback,
}: {
  name: string;
  image: string;
  feedback: string;
}) {
  const locale = useLocale();

  return (
    <figure
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col gap-3 w-96 h-52 rounded-site border border-stroke bg-card-bg p-6 mx-2"
      aria-labelledby={`testimonial-${name}`}
    >
      <header className="flex items-center gap-3">
        <div className="relative w-9 h-9 shrink-0">
          <Image
            src={image}
            alt={`${name}'s profile`}
            width={36}
            height={36}
            className="rounded-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h3 id={`testimonial-${name}`} className="text-base font-bold">
            {name}
          </h3>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                className="text-yellow-500"
                fill="currentColor"
                key={i}
                size={14}
              />
            ))}
          </div>
        </div>
      </header>
      <blockquote
        className="text-secondary text-sm leading-relaxed flex-1"
        aria-label={`Testimonial description from ${name}`}
      >
        {feedback}
      </blockquote>
    </figure>
  );
}

export default function Testimonials() {
  const t = useTranslations('landing.testimonials');

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
        <Marquee direction="right" speed={40} gradient={false} autoFill>
          {testimonials.slice(0, 7).map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row1-${index}`}
              name={name}
              image={image}
              feedback={feedback}
            />
          ))}
        </Marquee>
        <Marquee direction="left" speed={40} gradient={false} autoFill>
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
    </Section>
  );
}
