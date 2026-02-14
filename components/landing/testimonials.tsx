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
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col items-center gap-5 w-96 h-48 rounded-xl border border-stroke bg-card-bg px-6 py-5 mx-6 overflow-hidden"
    >
      <div className="w-full flex items-center justify-start gap-3">
        <div>
          <Image
            src={image}
            alt={name}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        </div>
        <div>
          <h3 className="text-lg font-bold">{name}</h3>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                className="text-yellow-500"
                fill="currentColor"
                key={i}
                size={16}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-base leading-relaxed line-clamp-3">{feedback}</p>
    </div>
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
  ];

  return (
    <Section id="testimonials">
      <SectionUpTitle className="gbf gbf-md gbf-left gbf-bottom">
        {t('upTitle')}
      </SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>

      <div className="flex flex-col gap-6" dir="ltr">
        <Marquee direction="right" speed={40} gradient={false} autoFill>
          {testimonials.map(({ name, image, feedback }, index) => (
            <TestimonialCard
              key={`row1-${index}`}
              name={name}
              image={image}
              feedback={feedback}
            />
          ))}
        </Marquee>
        <Marquee direction="left" speed={40} gradient={false} autoFill>
          {testimonials.map(({ name, image, feedback }, index) => (
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
