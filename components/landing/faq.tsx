'use client';

import {
  Section,
  SectionSubtitle,
  SectionTitle,
  SectionUpTitle,
} from '../layout/section';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import Container from '../layout/container';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAppearance } from '../providers/appearance-provider';
import { useLocale } from 'next-intl';

function FaqCard({
  question,
  answer,
  isOpen,
  onToggle,
  className,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div
      data-mo="slide"
      className={cn(
        'w-full bg-card-bg flex flex-col items-start border border-stroke rounded-site p-5',
        className,
      )}
    >
      <button
        className="w-full flex items-center justify-between gap-3 text-start"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <h3 className="text-base font-bold">{question}</h3>
        <div className="relative w-6 h-6">
          <Plus
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-0 rotate-45 scale-75'
                : 'opacity-100 rotate-0 scale-100'
            }`}
            size={22}
          />
          <Minus
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-45 scale-75'
            }`}
            size={22}
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-secondary text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  const t = useTranslations('landing.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { appearance } = useAppearance();
  const locale = useLocale() as 'ar' | 'en';

  // Filter FAQs for manasik platform (or shared)
  const faqs = (appearance.faqs || [])
    .filter((faq) => faq.platform === 'manasik' || faq.platform === 'shared')
    .map((faq) => ({
      question: locale === 'ar' ? faq.question.ar : faq.question.en,
      answer: locale === 'ar' ? faq.answer.ar : faq.answer.en,
    }));

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Section id="faq">
      <SectionUpTitle className="gbf gbf-sm gbf-right">
        {t('upTitle')}
      </SectionUpTitle>
      <SectionTitle>{t('title')}</SectionTitle>
      <SectionSubtitle>{t('subtitle')}</SectionSubtitle>

      <Container>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <FaqCard
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              className={`
              ${index / 5 === 1 ? 'gbf gbf-lg gbf-right' : index / 11 === 1 ? 'gbf gbf-lg gbf-left' : ''}`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
